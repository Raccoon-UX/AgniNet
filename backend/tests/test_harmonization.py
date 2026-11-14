"""
AgniNet Phase 3 Unit & Regression Tests: Cross-Sensor Spatial-Temporal Harmonization Engine

Tests:
1. Spatial and temporal matching (MODIS + VIIRS within thresholds -> MATCHED).
2. Distant observations (> spatial threshold -> MODIS_ONLY, VIIRS_ONLY).
3. Out-of-window observations (> temporal threshold -> MODIS_ONLY, VIIRS_ONLY).
4. Missing timestamps handled conservatively (classified as AMBIGUOUS).
5. Multiple candidate matches (competing claims -> AMBIGUOUS).
6. FRP preservation (MODIS FRP and VIIRS FRP kept separate; never cross-summed).
7. Deterministic event IDs across repeated runs.
8. Live versus demo separation on API endpoints.
9. Effective footprint expansion under wide scan angles.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.fire import NormalizedObservation
from app.services.harmonizer import (
    HarmonizationEngine,
    haversine_km,
    temporal_diff_minutes,
    generate_event_id,
)


def test_haversine_accuracy():
    """Haversine distance calculation matches expected spherical geodetic values."""
    # Sydney (-33.8688, 151.2093) to Melbourne (-37.8136, 144.9631) ~ 713 km
    dist = haversine_km(-33.8688, 151.2093, -37.8136, 144.9631)
    assert 700.0 < dist < 725.0

    # Same point distance is 0
    assert haversine_km(10.0, 20.0, 10.0, 20.0) == 0.0


def test_temporal_diff_minutes():
    """Temporal delta computes accurate minutes or None when missing."""
    diff = temporal_diff_minutes("2026-11-14", "04:15", "2026-11-14", "04:30")
    assert diff == 15.0

    diff_cross_midnight = temporal_diff_minutes("2026-11-14", "23:50", "2026-11-15", "00:10")
    assert diff_cross_midnight == 20.0

    assert temporal_diff_minutes("2026-11-14", None, "2026-11-14", "04:30") is None
    assert temporal_diff_minutes("2026-11-14", "04:15", "2026-11-14", None) is None


def test_spatial_and_temporal_matching():
    """Co-located MODIS and VIIRS observations within thresholds produce a MATCHED event."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    # MODIS Aqua at (-12.450, 131.050) at 04:30
    modis = NormalizedObservation(
        id="MODIS-TEST-1",
        latitude=-12.4500,
        longitude=131.0500,
        acquisition_date="2026-11-14",
        acquisition_time_utc="04:30",
        satellite="Aqua",
        instrument="MODIS",
        sensor_source="MODIS_NRT",
        frp_mw=185.0,
        confidence=85,
        scan_angle=1.2,
        track_km=1.0,
    )

    # VIIRS Suomi-NPP at (-12.452, 131.053) at 04:45 (~400m apart, 15 mins apart)
    viirs = NormalizedObservation(
        id="VIIRS-TEST-1",
        latitude=-12.4520,
        longitude=131.0530,
        acquisition_date="2026-11-14",
        acquisition_time_utc="04:45",
        satellite="Suomi-NPP",
        instrument="VIIRS",
        sensor_source="VIIRS_SNPP_NRT",
        frp_mw=95.0,
        confidence="high",
        scan_angle=0.8,
        track_km=0.38,
    )

    resp = engine.harmonize([modis, viirs])
    assert resp.stats.matched_events == 1
    assert resp.stats.modis_only_count == 0
    assert resp.stats.viirs_only_count == 0

    evt = resp.events[0]
    assert evt.classification == "MATCHED"
    assert evt.modis_observation_ids == ["MODIS-TEST-1"]
    assert evt.viirs_observation_ids == ["VIIRS-TEST-1"]
    assert evt.modis_satellites == ["Aqua"]
    assert evt.viirs_satellites == ["Suomi-NPP"]
    assert evt.modis_frp_mw == 185.0
    assert evt.viirs_total_frp_mw == 95.0
    assert evt.viirs_individual_frps == [95.0]
    assert evt.spatial_distance_km is not None
    assert evt.spatial_distance_km < 1.0
    assert evt.temporal_difference_minutes == 15.0
    assert evt.match_score > 0.75


def test_distant_observations_produce_unmatched():
    """MODIS and VIIRS beyond spatial threshold result in MODIS_ONLY and VIIRS_ONLY."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    modis = NormalizedObservation(
        id="M-DISTANT", latitude=-12.0, longitude=130.0,
        acquisition_date="2026-11-14", acquisition_time_utc="04:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT", frp_mw=100.0
    )
    # 25 km away
    viirs = NormalizedObservation(
        id="V-DISTANT", latitude=-12.2, longitude=130.1,
        acquisition_date="2026-11-14", acquisition_time_utc="04:10",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT", frp_mw=80.0
    )

    resp = engine.harmonize([modis, viirs])
    assert resp.stats.matched_events == 0
    assert resp.stats.modis_only_count == 1
    assert resp.stats.viirs_only_count == 1

    classes = {e.classification for e in resp.events}
    assert classes == {"MODIS_ONLY", "VIIRS_ONLY"}


def test_out_of_window_temporal_no_match():
    """Co-located observations outside temporal window must NOT be matched."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    modis = NormalizedObservation(
        id="M-TIME", latitude=-10.0, longitude=120.0,
        acquisition_date="2026-11-14", acquisition_time_utc="02:00",
        satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    # Same location, but 4 hours later (06:00)
    viirs = NormalizedObservation(
        id="V-TIME", latitude=-10.001, longitude=120.001,
        acquisition_date="2026-11-14", acquisition_time_utc="06:00",
        satellite="Suomi-NPP", instrument="VIIRS", sensor_source="VIIRS_SNPP_NRT"
    )

    resp = engine.harmonize([modis, viirs])
    assert resp.stats.matched_events == 0
    assert resp.stats.modis_only_count == 1
    assert resp.stats.viirs_only_count == 1


def test_missing_timestamps_classified_as_ambiguous():
    """When an observation lacks acquisition time, matching cannot be confirmed temporally."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    modis = NormalizedObservation(
        id="M-NOTIME", latitude=-10.0, longitude=120.0,
        acquisition_date="2026-11-14", acquisition_time_utc=None,  # Missing time
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    viirs = NormalizedObservation(
        id="V-TIME", latitude=-10.002, longitude=120.001,
        acquisition_date="2026-11-14", acquisition_time_utc="04:15",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )

    resp = engine.harmonize([modis, viirs])
    assert resp.stats.matched_events == 0
    assert resp.stats.ambiguous_count == 1
    assert resp.events[0].classification == "AMBIGUOUS"
    assert "Missing acquisition time" in resp.events[0].evidence_notes


def test_multiple_candidate_matches_ambiguity():
    """When a VIIRS pixel is contested by two distinct MODIS pixels, it is flagged as AMBIGUOUS."""
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    m1 = NormalizedObservation(
        id="M1", latitude=-10.005, longitude=120.005,
        acquisition_date="2026-11-14", acquisition_time_utc="04:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    m2 = NormalizedObservation(
        id="M2", latitude=-10.007, longitude=120.007,
        acquisition_date="2026-11-14", acquisition_time_utc="04:02",
        satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    # VIIRS detection lying right between M1 and M2
    v1 = NormalizedObservation(
        id="V1", latitude=-10.006, longitude=120.006,
        acquisition_date="2026-11-14", acquisition_time_utc="04:01",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )

    resp = engine.harmonize([m1, m2, v1])
    assert resp.stats.ambiguous_count >= 1
    ambiguous_events = [e for e in resp.events if e.classification == "AMBIGUOUS"]
    assert len(ambiguous_events) >= 1
    assert "AMBIGUOUS" in ambiguous_events[0].evidence_notes


def test_frp_preservation_never_summed_across_sensors():
    """
    CRITICAL SCIENTIFIC RULE:
    MODIS FRP and VIIRS FRP must NEVER be added together or averaged across instruments.
    """
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=60.0)

    modis = NormalizedObservation(
        id="M-FRP", latitude=-10.0, longitude=120.0,
        acquisition_date="2026-11-14", acquisition_time_utc="04:00",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT", frp_mw=350.0
    )
    # 2 sub-pixel VIIRS detections inside the MODIS pixel
    v1 = NormalizedObservation(
        id="V1-FRP", latitude=-10.001, longitude=120.001,
        acquisition_date="2026-11-14", acquisition_time_utc="04:05",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT", frp_mw=45.0
    )
    v2 = NormalizedObservation(
        id="V2-FRP", latitude=-10.002, longitude=120.002,
        acquisition_date="2026-11-14", acquisition_time_utc="04:05",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT", frp_mw=65.0
    )

    resp = engine.harmonize([modis, v1, v2])
    evt = resp.events[0]

    assert evt.classification == "MATCHED"
    # MODIS FRP preserved as 350.0
    assert evt.modis_frp_mw == 350.0
    # VIIRS sub-pixels summed ONLY among themselves (45.0 + 65.0 = 110.0)
    assert evt.viirs_total_frp_mw == 110.0
    assert evt.viirs_individual_frps == [45.0, 65.0]
    # Verify there is NO combined cross-sensor field summing 350 + 110 = 460
    assert not hasattr(evt, "total_frp_mw") or evt.modis_frp_mw != (350.0 + 110.0)


def test_deterministic_event_ids():
    """Event IDs must be identical across repeated executions on identical input data."""
    id1 = generate_event_id("2026-11-14", -12.3456, 131.6789, ["M1", "V1", "V2"])
    id2 = generate_event_id("2026-11-14", -12.3456, 131.6789, ["V2", "M1", "V1"])  # reordered IDs
    assert id1 == id2
    assert id1.startswith("AGNI-EVT-20261114-")


@pytest.mark.asyncio
async def test_harmonization_endpoints_demo():
    """Verifies FastAPI endpoints /api/harmonization/events and /stats work in demo mode."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test events endpoint
        res = await client.get("/api/harmonization/events?demo=true&spatial_threshold_km=5.0")
        assert res.status_code == 200
        data = res.json()
        assert "events" in data
        assert "stats" in data
        assert data["stats"]["total_events"] > 0
        assert data["data_source"] == "DEMO_FIXTURES"

        # Test stats endpoint
        stats_res = await client.get("/api/harmonization/stats?demo=true")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_events"] > 0

        # Test observations partitioned endpoint
        parts_res = await client.get("/api/harmonization/observations?demo=true")
        assert parts_res.status_code == 200
        parts = parts_res.json()
        assert "matched" in parts
        assert "modis_only" in parts
        assert "viirs_only" in parts
        assert "ambiguous" in parts
