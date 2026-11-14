import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "operational"
    assert "endpoints" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "nasa_firms_configured" in data
    assert "data_mode" in data
    assert "cache_entries" in data


@pytest.mark.asyncio
async def test_sensors_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/sensors")
    assert response.status_code == 200
    data = response.json()
    assert "supported_sources" in data
    assert len(data["supported_sources"]) >= 4
    source_ids = [s["source_id"] for s in data["supported_sources"]]
    assert "MODIS_NRT" in source_ids
    assert "VIIRS_NOAA20_NRT" in source_ids
    assert "VIIRS_NOAA21_NRT" in source_ids
    assert "VIIRS_SNPP_NRT" in source_ids
