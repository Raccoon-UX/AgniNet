import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_demo_observations_default():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/fires?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert data["is_live"] is False
    assert data["data_source"] == "DEMO_FIXTURES"
    assert data["total_count"] > 0
    assert len(data["observations"]) == data["total_count"]
    assert "DEMO" in data["notice"]


@pytest.mark.asyncio
async def test_demo_source_filtering():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Filter MODIS only
        res_modis = await client.get("/api/fires?source=MODIS&demo=true")
        assert res_modis.status_code == 200
        for o in res_modis.json()["observations"]:
            assert o["instrument"] == "MODIS"

        # Filter VIIRS only
        res_viirs = await client.get("/api/fires?source=VIIRS&demo=true")
        assert res_viirs.status_code == 200
        for o in res_viirs.json()["observations"]:
            assert o["instrument"] == "VIIRS"


@pytest.mark.asyncio
async def test_demo_min_frp_filtering():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/fires?min_frp=400&demo=true")
        assert res.status_code == 200
        for o in res.json()["observations"]:
            assert o["frp_mw"] >= 400.0


@pytest.mark.asyncio
async def test_kpi_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/fires/kpis?demo=true")
        assert res.status_code == 200
        kpis = res.json()
        assert "total_hotspots" in kpis
        assert "total_frp_mw" in kpis
        assert kpis["total_hotspots"] > 0
