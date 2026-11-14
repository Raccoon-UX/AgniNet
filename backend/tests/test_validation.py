import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_incomplete_bounding_box():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Only min_lon provided
        res = await client.get("/api/fires?min_lon=-120&demo=true")
    assert res.status_code == 400
    assert "Incomplete bounding box" in res.json()["detail"]


@pytest.mark.asyncio
async def test_inverted_bounding_box():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # min_lon > max_lon
        res = await client.get("/api/fires?min_lon=-110&max_lon=-120&min_lat=30&max_lat=40&demo=true")
    assert res.status_code == 400
    assert "min_lon must be less than max_lon" in res.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_date_format():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/fires?date=14-11-2026&demo=true")
    assert res.status_code == 400
    assert "Expected YYYY-MM-DD" in res.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_calendar_date():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/fires?date=2026-02-31&demo=true")
    assert res.status_code == 400
    assert "Invalid calendar date" in res.json()["detail"]


@pytest.mark.asyncio
async def test_out_of_bounds_parameters():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Latitude > 90
        res = await client.get("/api/fires?min_lat=95&demo=true")
    assert res.status_code == 422  # FastApi Pydantic query validation error
