"""
AgniNet Phase 2.2 Regression Tests: Telemetry Validation, Null Safety & Sensor Counting

Verifies:
1. Rejection of invalid calendar dates (e.g. 2026-02-31, 2026-13-45).
2. Rejection of invalid acquisition times (e.g. 25:70, 14:99, non-numeric).
3. Preservation of missing scientific telemetry as None (brightness, scan, track, FRP, day/night).
4. Separation of 4 FIRMS data feeds from 5 physical satellite platforms.
5. Verification of all 4 configured FIRMS feeds individually and in concert.
"""

import pytest
from unittest.mock import patch
from app.config import settings
from app.models.fire import NormalizedObservation
from app.services.parser import parse_firms_csv, compute_kpis
from app.services.firms_client import FirmsClient


def test_reject_impossible_calendar_dates():
    """Parser must reject impossible calendar dates like Feb 31 or Month 13."""
    csv_invalid_dates = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,2026-02-31,0418,Aqua,MODIS,88,6.1N,298.5,385.0,N
-7.892,-62.341,334.0,0.8,1.0,2026-13-01,0210,Terra,MODIS,76,6.1N,292.0,88.2,N
-12.100,132.500,340.5,1.0,1.0,2026-11-14,0315,Aqua,MODIS,80,6.1N,295.0,120.0,N
"""
    obs = parse_firms_csv(csv_invalid_dates, "MODIS_NRT")
    # Only the third row with real calendar date 2026-11-14 should survive
    assert len(obs) == 1
    assert obs[0].acquisition_date == "2026-11-14"
    assert obs[0].latitude == -12.100


def test_reject_invalid_acquisition_times():
    """Parser must reject malformed times (hours > 23, minutes > 59, non-numeric)."""
    csv_invalid_times = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,2026-11-14,2570,Aqua,MODIS,88,6.1N,298.5,385.0,N
-7.892,-62.341,334.0,0.8,1.0,2026-11-14,1499,Terra,MODIS,76,6.1N,292.0,88.2,N
-5.123,-50.456,350.0,1.0,1.0,2026-11-14,abcd,Aqua,MODIS,80,6.1N,295.0,150.0,N
-12.100,132.500,340.5,1.0,1.0,2026-11-14,0315,Aqua,MODIS,80,6.1N,295.0,120.0,N
"""
    obs = parse_firms_csv(csv_invalid_times, "MODIS_NRT")
    # Only row 4 with 0315 (03:15) should survive
    assert len(obs) == 1
    assert obs[0].acquisition_time_utc == "03:15"


def test_null_telemetry_preservation():
    """Missing scientific fields must be preserved as None, never replaced with 0 or default values."""
    csv_null_fields = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,,,,2026-11-14,,Aqua,MODIS,,,,,
"""
    obs = parse_firms_csv(csv_null_fields, "MODIS_NRT")
    assert len(obs) == 1
    record = obs[0]
    assert record.brightness_kelvin is None
    assert record.bright_t31_kelvin is None
    assert record.scan_angle is None
    assert record.track_km is None
    assert record.frp_mw is None
    assert record.day_night is None
    assert record.confidence is None
    assert record.confidence_numeric is None
    assert record.acquisition_time_utc is None


def test_separate_feeds_from_platforms():
    """
    Confirms distinction between 4 FIRMS NRT feeds and 5 physical spacecraft platforms:
    MODIS: Terra & Aqua (1 feed: MODIS_NRT)
    VIIRS: Suomi-NPP, NOAA-20, NOAA-21 (3 feeds: VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT)
    """
    assert len(FirmsClient.SOURCE_MAP["ALL"]) == 4
    assert set(FirmsClient.SOURCE_MAP["ALL"]) == {
        "MODIS_NRT",
        "VIIRS_NOAA20_NRT",
        "VIIRS_NOAA21_NRT",
        "VIIRS_SNPP_NRT",
    }

    # Simulate observation records from 3 satellites
    obs1 = NormalizedObservation(
        id="T1", latitude=-10.0, longitude=120.0, acquisition_date="2026-11-14",
        satellite="Terra", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    obs2 = NormalizedObservation(
        id="A1", latitude=-11.0, longitude=121.0, acquisition_date="2026-11-14",
        satellite="Aqua", instrument="MODIS", sensor_source="MODIS_NRT"
    )
    obs3 = NormalizedObservation(
        id="N1", latitude=-12.0, longitude=122.0, acquisition_date="2026-11-14",
        satellite="NOAA-20", instrument="VIIRS", sensor_source="VIIRS_NOAA20_NRT"
    )

    kpis = compute_kpis([obs1, obs2, obs3])
    # 3 distinct physical satellites detected across 2 feeds
    assert set(kpis.detected_satellites) == {"Terra", "Aqua", "NOAA-20"}
    assert len(kpis.detected_satellites) == 3


@pytest.mark.asyncio
async def test_all_four_configured_feeds():
    """Tests each of the four individual feeds for correct mapping and retrieval."""
    client = FirmsClient()

    feed_samples = {
        "MODIS_NRT": """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-15.0,130.0,340.0,1.2,1.0,2026-11-14,0430,Aqua,MODIS,85,6.1N,295.0,210.0,D
""",
        "VIIRS_NOAA20_NRT": """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-16.0,131.0,365.0,1.0,0.38,2026-11-14,0445,1,VIIRS,h,2.0-NRT,300.0,420.0,D
""",
        "VIIRS_NOAA21_NRT": """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-17.0,132.0,355.0,1.0,0.38,2026-11-14,0500,2,VIIRS,n,1.0-NRT,298.0,310.0,D
""",
        "VIIRS_SNPP_NRT": """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-18.0,133.0,370.0,1.1,0.38,2026-11-14,0515,N,VIIRS,h,2.0-NRT,302.0,450.0,D
""",
    }

    async def mock_fetch(source, *args, **kwargs):
        csv_data = feed_samples[source]
        return parse_firms_csv(csv_data, source)

    with patch.object(settings, "nasa_firms_map_key", "valid_mock_key_16char_long"):
        with patch.object(client, "fetch_area_feed", side_effect=mock_fetch):
            # Test individual feed queries
            for feed_id, expected_sat in [
                ("MODIS_NRT", "Aqua"),
                ("VIIRS_NOAA20_NRT", "NOAA-20"),
                ("VIIRS_NOAA21_NRT", "NOAA-21"),
                ("VIIRS_SNPP_NRT", "Suomi-NPP"),
            ]:
                resp = await client.get_observations(source=feed_id, bbox=[120.0, -25.0, 145.0, -12.0])
                assert resp.is_live is True
                assert resp.status == "healthy"
                assert len(resp.observations) == 1
                assert resp.observations[0].satellite == expected_sat
                assert resp.active_feed_count == 1

            # Test querying ALL 4 feeds combined
            all_resp = await client.get_observations(source="ALL", bbox=[120.0, -25.0, 145.0, -12.0])
            assert all_resp.is_live is True
            assert all_resp.status == "healthy"
            assert len(all_resp.observations) == 4
            assert all_resp.active_feed_count == 4
            assert all_resp.total_feed_count == 4
            assert set(all_resp.succeeded_sources) == {
                "MODIS_NRT",
                "VIIRS_NOAA20_NRT",
                "VIIRS_NOAA21_NRT",
                "VIIRS_SNPP_NRT",
            }
            # 4 physical satellites observed (Aqua, NOAA-20, NOAA-21, Suomi-NPP)
            assert all_resp.detected_platform_count == 4
            assert set(all_resp.kpis.detected_satellites) == {"Aqua", "NOAA-20", "NOAA-21", "Suomi-NPP"}
