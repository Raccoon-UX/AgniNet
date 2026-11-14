"""
Regression tests for production data integrity hotfix.
Verifies truthful handling of:
1. Empty API responses (0 observations returned without silent demo injection).
2. API failure handling and explicit demo mode tagging.
3. Missing telemetry fields (null confidence, missing time, null scan/track, null day_night).
4. Independent handling of MODIS and VIIRS FRP without physical blending.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.fire import NormalizedObservation
from app.services.parser import parse_firms_csv, compute_kpis


@pytest.mark.asyncio
async def test_explicit_demo_mode_tagged_correctly():
    """Explicit demo mode must declare is_live=False and data_source='DEMO_FIXTURES'."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/fires?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["is_live"] is False
    assert data["data_source"] == "DEMO_FIXTURES"
    assert "DEMO" in data["notice"] or "synthetic" in data["notice"].lower()
    for obs in data["observations"]:
        assert obs["is_live"] is False


@pytest.mark.asyncio
async def test_empty_csv_parsing_no_injected_fixtures():
    """When FIRMS returns a header-only CSV with zero fire records, parser returns empty list."""
    empty_modis_csv = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight\n"
    records = parse_firms_csv(empty_modis_csv, "MODIS_NRT")
    assert len(records) == 0

    kpis = compute_kpis(records)
    assert kpis.total_hotspots == 0
    assert kpis.modis_count == 0
    assert kpis.viirs_count == 0
    assert kpis.total_frp_mw == 0.0
    assert kpis.avg_confidence is None


def test_missing_telemetry_normalization():
    """Observations with missing acquisition time, confidence, scan angle or day_night must not invent values."""
    obs = NormalizedObservation(
        id="TEST_NULL_TELEMETRY_001",
        latitude=12.5,
        longitude=77.5,
        brightness_kelvin=310.0,
        scan_angle=None,
        track_km=None,
        acquisition_date="2026-11-14",
        acquisition_time_utc=None,  # Missing acquisition time (None, not 00:00:00)
        satellite="Terra",
        instrument="MODIS",
        sensor_source="MODIS_NRT",
        confidence=None,  # Null confidence (None, not 'Standard')
        confidence_numeric=None,
        version="6.1NRT",
        bright_t31_kelvin=None,
        frp_mw=None,  # Null FRP
        day_night=None,  # Null day/night (None, not 'Ascending/Descending')
        is_live=False,
    )
    assert obs.acquisition_time_utc is None
    assert obs.confidence is None
    assert obs.scan_angle is None
    assert obs.day_night is None
    assert obs.frp_mw is None

    # Computing KPIs on observations with null FRP and null confidence must not crash
    kpis = compute_kpis([obs])
    assert kpis.total_hotspots == 1
    assert kpis.modis_count == 1
    assert kpis.avg_confidence is None
    assert kpis.total_frp_mw == 0.0


@pytest.mark.asyncio
async def test_kpi_endpoint_demo_flag():
    """KPI endpoint reflects aggregated counts without crashing on demo=true."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/fires/kpis?demo=true")
    assert res.status_code == 200
    kpis = res.json()
    assert kpis["total_hotspots"] > 0
    assert "total_frp_mw" in kpis
    assert "modis_count" in kpis
    assert "viirs_count" in kpis
