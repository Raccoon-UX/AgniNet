"""
AgniNet Phase 2.1 Regression Tests: Data Integrity & Reliability

Verifies:
1. Rejection of missing acquisition date.
2. Preservation of missing acquisition time as None (no fake '00:00').
3. Preservation of missing confidence as None (no fake 85).
4. No fabricated harmonization metrics in KPI computation.
5. All configured sensor feed selection in ALL query.
6. Partial upstream feed failure handling (degraded status, succeeded/failed sources tracking).
7. Total upstream failure graceful fallback to demo.
8. Invalid upstream HTML/CSV handling.
9. Correct LIVE vs DEMO status identification.
"""

import pytest
from unittest.mock import AsyncMock, patch
from app.config import settings
from app.services.parser import parse_firms_csv, compute_kpis
from app.services.firms_client import FirmsClient, FirmsApiException
from app.services.demo_service import get_demo_observations


def test_missing_acquisition_date():
    """Records missing acquisition date must be safely rejected."""
    csv_missing_date = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,,0418,Aqua,MODIS,88,6.1N,298.5,385.0,N
-7.892,-62.341,334.0,0.8,1.0,2026-11-14,0210,Terra,MODIS,76,6.1N,292.0,88.2,N
"""
    obs = parse_firms_csv(csv_missing_date, "MODIS_NRT")
    # First row rejected due to missing date, second row parsed
    assert len(obs) == 1
    assert obs[0].satellite == "Terra"
    assert obs[0].acquisition_date == "2026-11-14"


def test_missing_acquisition_time():
    """Records missing acquisition time must have acquisition_time_utc as None, not '00:00'."""
    csv_missing_time = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,2026-11-14,,Aqua,MODIS,88,6.1N,298.5,385.0,N
"""
    obs = parse_firms_csv(csv_missing_time, "MODIS_NRT")
    assert len(obs) == 1
    assert obs[0].acquisition_time_utc is None


def test_missing_confidence():
    """Records missing confidence must have confidence and confidence_numeric as None, never 85."""
    csv_missing_conf = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-9.4215,-54.8912,382.4,1.1,0.38,2026-11-14,0415,1,VIIRS,,2.0-NRT,301.2,412.8,N
"""
    obs = parse_firms_csv(csv_missing_conf, "VIIRS_NOAA20_NRT")
    assert len(obs) == 1
    assert obs[0].confidence is None
    assert obs[0].confidence_numeric is None


def test_no_fabricated_harmonization_metrics():
    """compute_kpis must compute real data stats and never fabricate cross-sensor matches."""
    csv_data = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,2026-11-14,0418,Aqua,MODIS,80,6.1N,298.5,100.0,N
-7.892,-62.341,334.0,0.8,1.0,2026-11-14,0210,Terra,MODIS,60,6.1N,292.0,50.0,N
"""
    obs = parse_firms_csv(csv_data, "MODIS_NRT")
    kpis = compute_kpis(obs)
    
    assert kpis.total_hotspots == 2
    assert kpis.modis_count == 2
    assert kpis.viirs_count == 0
    assert kpis.total_frp_mw == 150.0
    assert kpis.avg_confidence == 70.0
    # Harmonized matches are NOT a field of compute_kpis (reserved for Phase 3 engine)
    assert not hasattr(kpis, "harmonized_matches")


def test_all_configured_sensor_feed_selection():
    """FirmsClient SOURCE_MAP['ALL'] must query all configured MODIS and VIIRS feeds."""
    sources = FirmsClient.SOURCE_MAP["ALL"]
    assert "MODIS_NRT" in sources
    assert "VIIRS_NOAA20_NRT" in sources
    assert "VIIRS_NOAA21_NRT" in sources
    assert "VIIRS_SNPP_NRT" in sources
    assert len(sources) == 4


def test_invalid_upstream_csv_or_html():
    """Parser must reject HTML error pages or empty CSVs without raising unhandled errors."""
    html_error = "<!DOCTYPE html><html><body>503 Service Unavailable</body></html>"
    obs_html = parse_firms_csv(html_error, "MODIS_NRT")
    assert obs_html == []

    empty_csv = ""
    obs_empty = parse_firms_csv(empty_csv, "MODIS_NRT")
    assert obs_empty == []

    header_only = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight\n"
    obs_header = parse_firms_csv(header_only, "MODIS_NRT")
    assert obs_header == []


@pytest.mark.asyncio
async def test_partial_upstream_failure_handling():
    """When some feeds fail and some succeed, status must be degraded with is_partial=True."""
    client = FirmsClient()

    # Mock fetch_area_feed: succeed for MODIS_NRT, fail for VIIRS
    async def mock_fetch(source, *args, **kwargs):
        if "MODIS" in source:
            return parse_firms_csv(
                """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,2026-11-14,0418,Aqua,MODIS,88,6.1N,298.5,385.0,N
""",
                source,
            )
        else:
            raise FirmsApiException("NASA FIRMS feed unavailable", status_code=503)

    with patch.object(settings, "nasa_firms_map_key", "mock_key_for_test"):
        with patch.object(client, "fetch_area_feed", side_effect=mock_fetch):
            resp = await client.get_observations(source="ALL", bbox=[10.0, 10.0, 20.0, 20.0])
            
            assert resp.is_live is True
            assert resp.data_source == "NASA_FIRMS_LIVE"
            assert resp.status == "degraded"
            assert resp.is_partial is True
            assert "MODIS_NRT" in resp.succeeded_sources
            assert len(resp.failed_sources) == 3
            assert len(resp.observations) == 1
            assert resp.total_count == 1
            assert "PARTIAL SENSOR FEED" in (resp.notice or "")


@pytest.mark.asyncio
async def test_total_upstream_failure_demo_fallback():
    """When all feeds fail, client must fall back to demo with demo_fallback status."""
    client = FirmsClient()

    with patch.object(settings, "nasa_firms_map_key", "mock_key_for_test"):
        with patch.object(client, "fetch_area_feed", side_effect=FirmsApiException("NASA FIRMS total outage", status_code=500)):
            resp = await client.get_observations(source="MODIS_NRT")
            
            assert resp.is_live is False
            assert resp.data_source == "DEMO_FIXTURES"
            assert resp.status == "demo_fallback"
            assert resp.is_partial is False
            assert len(resp.observations) > 0
            assert "synthetic fallback" in (resp.notice or "").lower()


def test_correct_live_vs_demo_status():
    """Demo fixtures must be explicitly marked as DEMO_FIXTURES and is_live=False."""
    resp = get_demo_observations()
    assert len(resp.observations) > 0
    assert resp.is_live is False
    assert resp.data_source == "DEMO_FIXTURES"
    assert resp.status == "demo_fallback"
    for obs in resp.observations:
        assert obs.is_live is False
    
    assert resp.kpis.total_hotspots > 0
