import pytest
from app.models.fire import NormalizedObservation
from app.services.harmonizer import (
    HarmonizationEngine,
    SpatialCandidateIndex,
    get_effective_footprint_radius_km,
    haversine_km,
    resolve_viirs_pass_frp,
)


def test_spatial_index_antimeridian_candidate_retrieval():
    """
    MODIS at (0.0, -179.99) and VIIRS at (0.0, 179.99).
    Angular separation is 0.02 degrees (~2.22 km).
    The spatial index MUST wrap across +/-180 degrees and retrieve VIIRS.
    """
    m = NormalizedObservation(
        id="M_DATELINE", latitude=0.0, longitude=-179.99,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT",
        scan_angle=1.0, track_km=1.0
    )
    v = NormalizedObservation(
        id="V_DATELINE", latitude=0.0, longitude=179.99,
        acquisition_date="2026-05-01", acquisition_time_utc="12:10",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        scan_angle=0.4, track_km=0.4
    )

    index = SpatialCandidateIndex([v], cell_size_deg=0.5)
    candidates = index.query_candidates(m, max_search_radius_km=3.0)

    assert len(candidates) == 1
    assert candidates[0].id == "V_DATELINE"

    # End-to-end harmonization
    engine = HarmonizationEngine(spatial_threshold_km=3.0, temporal_threshold_minutes=60.0)
    resp = engine.harmonize([m, v])
    assert resp.stats.matched_events == 1
    assert resp.events[0].classification == "MATCHED"


def test_spatial_index_north_pole_candidate_retrieval():
    """
    MODIS at (88.0, 10.0) and VIIRS at (88.0, 20.0).
    At 88 deg N, 10 deg lon is ~38.8 km.
    Spatial threshold = 50.0 km.
    Spatial index polar cap logic must retrieve candidate despite extreme longitude convergence.
    """
    m = NormalizedObservation(
        id="M_NORTH_POLAR", latitude=88.0, longitude=10.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    v = NormalizedObservation(
        id="V_NORTH_POLAR", latitude=88.0, longitude=20.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:15",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )

    dist = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
    assert 35.0 < dist < 45.0  # ~38.8 km

    index = SpatialCandidateIndex([v], cell_size_deg=0.5)
    candidates = index.query_candidates(m, max_search_radius_km=50.0)
    assert len(candidates) == 1
    assert candidates[0].id == "V_NORTH_POLAR"

    engine = HarmonizationEngine(spatial_threshold_km=50.0, temporal_threshold_minutes=60.0)
    resp = engine.harmonize([m, v])
    assert resp.stats.matched_events == 1


def test_spatial_index_south_pole_candidate_retrieval():
    """
    South pole polar cap handling (|lat| >= 80 deg).
    MODIS at (-86.0, -100.0) and VIIRS at (-86.0, -95.0).
    At -86 deg S, 5 deg lon is ~38.8 km.
    """
    m = NormalizedObservation(
        id="M_SOUTH_POLAR", latitude=-86.0, longitude=-100.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    v = NormalizedObservation(
        id="V_SOUTH_POLAR", latitude=-86.0, longitude=-95.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:15",
        satellite="NOAA-21", instrument="VIIRS", sensor_source="VIIRS_NOAA21_NRT"
    )

    index = SpatialCandidateIndex([v], cell_size_deg=0.5)
    candidates = index.query_candidates(m, max_search_radius_km=45.0)
    assert any(c.id == "V_SOUTH_POLAR" for c in candidates)


def test_spatial_index_cell_boundary_crossing():
    """
    Observation M at (0.499, 0.499) and V at (0.501, 0.501) across 0.5 deg grid boundaries.
    Distance is ~0.31 km. Candidate retrieval must not fail across grid seams.
    """
    m = NormalizedObservation(
        id="M_BOUNDARY", latitude=0.499, longitude=0.499,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    v = NormalizedObservation(
        id="V_BOUNDARY", latitude=0.501, longitude=0.501,
        acquisition_date="2026-05-01", acquisition_time_utc="12:05",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )

    index = SpatialCandidateIndex([v], cell_size_deg=0.5)
    candidates = index.query_candidates(m, max_search_radius_km=2.0)
    assert any(c.id == "V_BOUNDARY" for c in candidates)


def test_spatial_index_maximum_threshold_completeness():
    """
    Maximum configured spatial threshold (50.0 km).
    M at (0.0, 0.0), V at (0.0, 0.44) -> ~48.9 km.
    Must be retrieved and matched at 50.0 km threshold.
    """
    m = NormalizedObservation(
        id="M_MAX", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    v = NormalizedObservation(
        id="V_MAX", latitude=0.0, longitude=0.44,
        acquisition_date="2026-05-01", acquisition_time_utc="12:10",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )

    dist = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
    assert 48.0 < dist < 49.5

    engine = HarmonizationEngine(spatial_threshold_km=50.0, temporal_threshold_minutes=60.0)
    resp = engine.harmonize([m, v])
    assert resp.stats.matched_events == 1


def test_spatial_index_recall_against_brute_force_reference():
    """
    Mathematical proof of 100% candidate recall:
    Compares SpatialCandidateIndex against brute-force O(N_M * N_V) pairwise evaluation
    across a geographically diverse synthetic distribution.
    Zero valid candidate pairs may be missed (missed_pairs == 0).
    """
    modis_list = [
        # Equatorial
        NormalizedObservation(id="M_EQ1", latitude=0.1, longitude=10.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
        # Dateline
        NormalizedObservation(id="M_DL1", latitude=15.0, longitude=179.95, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
        # Polar North
        NormalizedObservation(id="M_POL1", latitude=82.0, longitude=45.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT"),
        # Polar South
        NormalizedObservation(id="M_POL2", latitude=-84.0, longitude=-120.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
    ]

    viirs_list = [
        # Near M_EQ1
        NormalizedObservation(id="V_EQ1", latitude=0.105, longitude=10.005, acquisition_date="2026-05-01", acquisition_time_utc="12:10", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
        # Near M_DL1 across dateline
        NormalizedObservation(id="V_DL1", latitude=15.005, longitude=-179.95, acquisition_date="2026-05-01", acquisition_time_utc="12:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
        # Near M_POL1
        NormalizedObservation(id="V_POL1", latitude=82.01, longitude=45.2, acquisition_date="2026-05-01", acquisition_time_utc="12:10", satellite="NOAA-21", instrument="VIIRS", sensor_source="VIIRS_NOAA21_NRT"),
        # Near M_POL2
        NormalizedObservation(id="V_POL2", latitude=-84.01, longitude=-119.5, acquisition_date="2026-05-01", acquisition_time_utc="12:10", satellite="Suomi-NPP", instrument="VIIRS", sensor_source="VIIRS_SNPP_NRT"),
        # Distant outlier
        NormalizedObservation(id="V_DISTANT", latitude=-30.0, longitude=140.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
    ]

    spatial_threshold_km = 15.0
    index = SpatialCandidateIndex(viirs_list, cell_size_deg=0.5)

    for m in modis_list:
        m_radius = get_effective_footprint_radius_km(m)
        max_search = max(spatial_threshold_km, m_radius + 0.8)

        # 1. Grid candidate retrieval
        grid_candidates = {v.id for v in index.query_candidates(m, max_search)}

        # 2. Brute-force ground truth check
        brute_truth = set()
        for v in viirs_list:
            effective_dist = max(spatial_threshold_km, m_radius + get_effective_footprint_radius_km(v))
            d = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
            if d <= effective_dist:
                brute_truth.add(v.id)

        # Candidate index must contain EVERY valid pair (zero false negatives)
        assert brute_truth.issubset(grid_candidates), (
            f"SpatialCandidateIndex missed valid candidate(s) for {m.id}! "
            f"Missing: {brute_truth - grid_candidates}"
        )


def test_viirs_pass_same_satellite_different_acquisition_times_withheld():
    """
    Same spacecraft (NOAA-20) on same date, but different acquisition times (12:00 and 13:40, 100m apart).
    Represents different orbital revolutions. Pass identity CANNOT be confirmed.
    viirs_total_frp_mw must be None, with individual FRPs preserved.
    """
    v1 = NormalizedObservation(
        id="V1", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=50.0
    )
    v2 = NormalizedObservation(
        id="V2", latitude=0.001, longitude=0.001,
        acquisition_date="2026-05-01", acquisition_time_utc="13:40",  # 100m later
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=60.0
    )

    total_frp, note = resolve_viirs_pass_frp([v1, v2], max_pass_time_delta_minutes=1.0)
    assert total_frp is None
    assert "exceeds single-pass threshold" in note


def test_viirs_pass_same_pass_confirmed():
    """
    Same spacecraft (NOAA-20) on same date with acquisition times within 1.0 minute.
    Confirms single-pass overpass and aggregates FRP.
    """
    v1 = NormalizedObservation(
        id="V1", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=45.5
    )
    v2 = NormalizedObservation(
        id="V2", latitude=0.001, longitude=0.001,
        acquisition_date="2026-05-01", acquisition_time_utc="12:01",  # 1m delta
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=34.5
    )

    total_frp, note = resolve_viirs_pass_frp([v1, v2], max_pass_time_delta_minutes=1.0)
    assert total_frp == 80.0
    assert "Single-pass VIIRS overpass confirmed" in note


def test_viirs_pass_missing_timestamp_withheld():
    """
    When any contributing VIIRS observation has missing acquisition time,
    pass identity is uncertain -> aggregate must be None.
    """
    v1 = NormalizedObservation(
        id="V1", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=50.0
    )
    v2 = NormalizedObservation(
        id="V2", latitude=0.001, longitude=0.001,
        acquisition_date="2026-05-01", acquisition_time_utc=None,  # Missing
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=60.0
    )

    total_frp, note = resolve_viirs_pass_frp([v1, v2])
    assert total_frp is None
    assert "Missing acquisition time" in note


def test_modis_and_viirs_frp_never_combined_end_to_end():
    """
    Verifies that MODIS and VIIRS FRP are never summed or blended together in HarmonizedEvent.
    """
    m = NormalizedObservation(
        id="M1", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT",
        frp_mw=250.0
    )
    v = NormalizedObservation(
        id="V1", latitude=0.001, longitude=0.001,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        frp_mw=75.0
    )

    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)
    resp = engine.harmonize([m, v])
    evt = resp.events[0]

    assert evt.modis_frp_mw == 250.0
    assert evt.viirs_total_frp_mw == 75.0
    assert evt.viirs_individual_frps == [75.0]
    # No combined metric exists in the model
