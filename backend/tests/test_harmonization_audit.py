import pytest
from app.models.fire import NormalizedObservation
from app.models.harmonization import HarmonizedEvent, HarmonizationStats
from app.services.harmonizer import (
    HarmonizationEngine,
    calculate_representative_centroid,
    get_effective_footprint_radius_km,
    haversine_km,
    temporal_diff_minutes,
    validate_coordinates,
)


def test_validate_coordinates():
    """Valid coordinates pass; invalid latitude or longitude raises ValueError."""
    lat, lon = validate_coordinates(45.0, 100.0)
    assert lat == 45.0
    assert lon == 100.0

    with pytest.raises(ValueError, match="Latitude"):
        validate_coordinates(95.0, 0.0)

    with pytest.raises(ValueError, match="Latitude"):
        validate_coordinates(-91.0, 0.0)

    with pytest.raises(ValueError, match="Longitude"):
        validate_coordinates(0.0, 185.0)

    with pytest.raises(ValueError, match="Longitude"):
        validate_coordinates(0.0, -181.0)


def test_dateline_crossing_haversine():
    """
    Points spanning the antimeridian (dateline):
    (0.0, 179.9) and (0.0, -179.9) are 0.2 degrees apart (~22.24 km),
    NOT ~40,000 km across the globe.
    """
    dist = haversine_km(0.0, 179.9, 0.0, -179.9)
    assert 22.0 < dist < 22.5

    # Check high-latitude dateline crossing
    dist_polar = haversine_km(80.0, 179.9, 80.0, -179.9)
    # At 80 deg N, parallel circumference is ~6960 km, 0.2 deg is ~3.86 km
    assert 3.5 < dist_polar < 4.2


def test_dateline_representative_centroid():
    """
    Circular mean for longitude must not place dateline fires on the Prime Meridian (lon 0.0).
    A pair of observations at lon +179.9 and lon -179.9 must have a representative longitude of 180.0 or -180.0.
    """
    obs1 = NormalizedObservation(
        id="M1", latitude=10.0, longitude=179.9,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    obs2 = NormalizedObservation(
        id="V1", latitude=10.0, longitude=-179.9,
        acquisition_date="2026-05-01", acquisition_time_utc="12:15",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )
    rep_lat, rep_lon = calculate_representative_centroid([obs1, obs2])
    assert rep_lat == 10.0
    # Longitude must be at +/-180, NOT near 0.0
    assert abs(abs(rep_lon) - 180.0) < 0.2


def test_high_latitude_polar_coordinates():
    """Points near north/south poles exhibit strong longitudinal convergence."""
    # At 89 degrees latitude, 1 degree longitude is ~1.94 km
    d1 = haversine_km(89.0, 0.0, 89.0, 1.0)
    assert 1.8 < d1 < 2.1

    # At equator (0 degrees), 1 degree longitude is ~111.19 km
    d2 = haversine_km(0.0, 0.0, 0.0, 1.0)
    assert 110.0 < d2 < 112.0


def test_exact_threshold_boundaries():
    """
    Verifies exact boundary conditions (<= threshold matches, > threshold fails).
    """
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    # 1. Temporal boundary test: exactly 60 minutes vs 61 minutes
    diff_exact = temporal_diff_minutes("2026-05-01", "12:00", "2026-05-01", "13:00")
    assert diff_exact == 60.0

    diff_over = temporal_diff_minutes("2026-05-01", "12:00", "2026-05-01", "13:01")
    assert diff_over == 61.0

    # 2. Harmonization check at exact temporal boundary
    m_exact = NormalizedObservation(
        id="M-EXACT", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT",
        scan_angle=1.0, track_km=1.0
    )
    v_exact = NormalizedObservation(
        id="V-EXACT", latitude=0.0, longitude=0.005,  # ~0.55 km apart
        acquisition_date="2026-05-01", acquisition_time_utc="13:00",  # exactly 60m
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        scan_angle=0.4, track_km=0.4
    )
    resp_exact = engine.harmonize([m_exact, v_exact])
    assert resp_exact.stats.matched_events == 1

    # Over boundary by 1 minute
    v_over = NormalizedObservation(
        id="V-OVER", latitude=0.0, longitude=0.005,
        acquisition_date="2026-05-01", acquisition_time_utc="13:01",  # 61m
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        scan_angle=0.4, track_km=0.4
    )
    resp_over = engine.harmonize([m_exact, v_over])
    assert resp_over.stats.matched_events == 0
    assert resp_over.stats.modis_only_count == 1
    assert resp_over.stats.viirs_only_count == 1


def test_midnight_day_boundary_transitions():
    """Cross-day temporal delta (e.g. 23:50 UTC to 00:10 UTC next day) computes to 20 minutes."""
    diff = temporal_diff_minutes("2026-05-01", "23:50", "2026-05-02", "00:10")
    assert diff == 20.0

    diff_reverse = temporal_diff_minutes("2026-05-02", "00:10", "2026-05-01", "23:50")
    assert diff_reverse == 20.0


def test_chained_candidate_relationships():
    """
    Non-transitive chained candidates:
    A (MODIS 1) matches B (VIIRS 1).
    B (VIIRS 1) matches C (MODIS 2).
    A does NOT match C directly (distance > threshold).
    The engine must NOT force arbitrary 1-to-1 matching;
    it must classify the cluster as AMBIGUOUS with multi-candidate evidence notes.
    """
    # 0.01 deg lat is ~1.11 km
    m1 = NormalizedObservation(
        id="M1", latitude=0.0, longitude=0.0,
        acquisition_date="2026-05-01", acquisition_time_utc="12:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT",
        scan_angle=1.0, track_km=1.0
    )
    v1 = NormalizedObservation(
        id="V1", latitude=0.01, longitude=0.0,  # ~1.11 km from M1
        acquisition_date="2026-05-01", acquisition_time_utc="12:10",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT",
        scan_angle=0.4, track_km=0.4
    )
    m2 = NormalizedObservation(
        id="M2", latitude=0.02, longitude=0.0,  # ~1.11 km from V1, ~2.22 km from M1
        acquisition_date="2026-05-01", acquisition_time_utc="12:15",
        satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT",
        scan_angle=1.0, track_km=1.0
    )

    # Use spatial threshold 1.5 km (M1-V1 is 1.11km <= 1.5, M2-V1 is 1.11km <= 1.5, M1-M2 is 2.22km > 1.5)
    engine = HarmonizationEngine(spatial_threshold_km=1.5, temporal_threshold_minutes=60.0)
    resp = engine.harmonize([m1, v1, m2])

    assert resp.stats.matched_events == 0
    assert resp.stats.ambiguous_count == 1
    amb_evt = resp.events[0]
    assert amb_evt.classification == "AMBIGUOUS"
    assert "M1" in amb_evt.modis_observation_ids
    assert "M2" in amb_evt.modis_observation_ids
    assert "V1" in amb_evt.viirs_observation_ids
    assert "AMBIGUOUS: Multi-sensor candidate association contested" in amb_evt.evidence_notes


def test_zero_duplicate_event_membership():
    """
    Verifies that every observation belongs to EXACTLY ONE unified event across all classifications.
    Total observation membership across all events must equal total input observations.
    """
    obs_list = [
        # Match cluster 1
        NormalizedObservation(id="M1", latitude=10.0, longitude=20.0, acquisition_date="2026-05-01", acquisition_time_utc="10:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
        NormalizedObservation(id="V1A", latitude=10.001, longitude=20.001, acquisition_date="2026-05-01", acquisition_time_utc="10:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
        NormalizedObservation(id="V1B", latitude=10.002, longitude=20.002, acquisition_date="2026-05-01", acquisition_time_utc="10:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
        # Ambiguous contested cluster
        NormalizedObservation(id="M2", latitude=30.0, longitude=50.0, acquisition_date="2026-05-01", acquisition_time_utc="14:00", satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT"),
        NormalizedObservation(id="M3", latitude=30.01, longitude=50.0, acquisition_date="2026-05-01", acquisition_time_utc="14:10", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
        NormalizedObservation(id="V2", latitude=30.005, longitude=50.0, acquisition_date="2026-05-01", acquisition_time_utc="14:12", satellite="Suomi-NPP", instrument="VIIRS", sensor_source="VIIRS_SNPP_NRT"),
        # Isolated singletons
        NormalizedObservation(id="M_ISO", latitude=-40.0, longitude=120.0, acquisition_date="2026-05-01", acquisition_time_utc="08:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
        NormalizedObservation(id="V_ISO", latitude=60.0, longitude=-140.0, acquisition_date="2026-05-01", acquisition_time_utc="20:00", satellite="NOAA-21", instrument="VIIRS", sensor_source="VIIRS_NOAA21_NRT"),
    ]

    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)
    resp = engine.harmonize(obs_list)

    all_event_obs_ids = []
    for evt in resp.events:
        all_event_obs_ids.extend(evt.modis_observation_ids + evt.viirs_observation_ids)

    # 1. Total counts must match
    assert len(all_event_obs_ids) == len(obs_list)
    # 2. No duplicates
    assert len(all_event_obs_ids) == len(set(all_event_obs_ids))
    # 3. Every input ID is present
    assert set(all_event_obs_ids) == {o.id for o in obs_list}


def test_reordered_input_determinism():
    """Reordering input observations produces identical event IDs, classifications, and counts."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    obs1 = [
        NormalizedObservation(id="M1", latitude=0.0, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"),
        NormalizedObservation(id="V1", latitude=0.002, longitude=0.002, acquisition_date="2026-05-01", acquisition_time_utc="12:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
        NormalizedObservation(id="V2", latitude=0.003, longitude=0.001, acquisition_date="2026-05-01", acquisition_time_utc="12:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"),
    ]
    # Reversed ordering
    obs2 = list(reversed(obs1))

    resp1 = engine.harmonize(obs1)
    resp2 = engine.harmonize(obs2)

    assert len(resp1.events) == len(resp2.events)
    assert resp1.events[0].id == resp2.events[0].id
    assert resp1.events[0].classification == resp2.events[0].classification
    assert resp1.events[0].match_score == resp2.events[0].match_score
    assert resp1.stats.matched_events == resp2.stats.matched_events


def test_frp_integrity_and_multi_pass_policy():
    """
    1. MODIS FRP and VIIRS FRP are NEVER summed together.
    2. VIIRS FRP is summed strictly across co-incident pixels from the SAME satellite pass.
    3. Multi-pass VIIRS observations have viirs_total_frp_mw set to None to prevent temporal double-counting,
       while all individual FRPs are preserved in viirs_individual_frps.
    """
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    # Single-pass VIIRS: NOAA-20 only
    m = NormalizedObservation(id="M", latitude=0.0, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT", frp_mw=120.5)
    v1 = NormalizedObservation(id="V1", latitude=0.001, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT", frp_mw=45.2)
    v2 = NormalizedObservation(id="V2", latitude=0.002, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT", frp_mw=38.4)

    resp_single = engine.harmonize([m, v1, v2])
    evt_single = resp_single.events[0]

    assert evt_single.modis_frp_mw == 120.5
    assert evt_single.viirs_total_frp_mw == 83.6  # 45.2 + 38.4
    assert evt_single.viirs_individual_frps == [45.2, 38.4]
    # Verify no cross-sensor summation (120.5 + 83.6 != total)

    # Multi-pass VIIRS: NOAA-20 + Suomi-NPP
    v_snpp = NormalizedObservation(id="V_SNPP", latitude=0.001, longitude=0.001, acquisition_date="2026-05-01", acquisition_time_utc="12:50", satellite="Suomi-NPP", instrument="VIIRS", sensor_source="VIIRS_SNPP_NRT", frp_mw=50.0)
    resp_multi = engine.harmonize([m, v1, v_snpp])
    evt_multi = resp_multi.events[0]

    assert evt_multi.modis_frp_mw == 120.5
    # Multi-pass prevents summing to avoid double-counting
    assert evt_multi.viirs_total_frp_mw is None
    assert set(evt_multi.viirs_individual_frps) == {45.2, 50.0}


def test_match_score_components_and_bounds():
    """Match score is bounded in [0.0, 1.0] and exposes explainable spatial and temporal components."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    m = NormalizedObservation(id="M", latitude=0.0, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT")
    v = NormalizedObservation(id="V", latitude=0.005, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:15", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT")

    resp = engine.harmonize([m, v])
    evt = resp.events[0]

    assert 0.0 <= evt.match_score <= 1.0
    assert evt.spatial_score is not None
    assert 0.0 <= evt.spatial_score <= 1.0
    assert evt.temporal_score is not None
    assert 0.0 <= evt.temporal_score <= 1.0


def test_filtered_statistics_consistency():
    """
    When events are filtered by classification, stats reflect the filtered view while preserving unfiltered totals.
    """
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    m1 = NormalizedObservation(id="M1", latitude=0.0, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT")
    v1 = NormalizedObservation(id="V1", latitude=0.001, longitude=0.0, acquisition_date="2026-05-01", acquisition_time_utc="12:10", satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT")
    m_solo = NormalizedObservation(id="M_SOLO", latitude=50.0, longitude=50.0, acquisition_date="2026-05-01", acquisition_time_utc="12:00", satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT")

    resp = engine.harmonize([m1, v1, m_solo])
    assert resp.stats.total_events == 2
    assert resp.stats.matched_events == 1
    assert resp.stats.modis_only_count == 1

    # Filter for MODIS_ONLY
    modis_only_events = [e for e in resp.events if e.classification == "MODIS_ONLY"]
    stats_filtered = engine._compute_stats(modis_only_events, unfiltered_total=len(resp.events))

    assert stats_filtered.total_events == 1
    assert stats_filtered.unfiltered_total_events == 2
    assert stats_filtered.modis_only_count == 1
    assert stats_filtered.matched_events == 0
    # Mean spatial distance must be None for MODIS_ONLY, not carried over from matched events
    assert stats_filtered.mean_spatial_distance_km is None
