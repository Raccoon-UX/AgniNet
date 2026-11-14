import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.fire import NormalizedObservation
from app.services.historical_service import HistoricalService

client = TestClient(app)


def test_historical_summary_endpoint():
    """GET /api/history/summary returns valid KPIs with strict FRP separation."""
    resp = client.get("/api/history/summary")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_events"] > 0
    assert data["total_observations"] > 0
    assert data["total_events"] <= data["total_observations"]
    assert data["matched_events"] >= 0
    assert data["modis_only_events"] >= 0
    assert data["viirs_only_events"] >= 0
    assert data["ambiguous_events"] >= 0

    # FRP strictly separated by sensor
    assert "modis_frp_gigawatts" in data
    assert "viirs_frp_gigawatts" in data
    assert data["modis_frp_gigawatts"] >= 0.0
    assert data["viirs_frp_gigawatts"] >= 0.0

    assert data["data_source"] in {"DEMO_HISTORICAL_ARCHIVE", "NASA_FIRMS_LIVE_ARCHIVE"}
    assert "provenance" in data


def test_historical_trends_daily_weekly_monthly():
    """GET /api/history/trends supports day, week, and month granularities."""
    # Day
    resp_day = client.get("/api/history/trends?granularity=day")
    assert resp_day.status_code == 200
    d_data = resp_day.json()
    assert d_data["granularity"] == "day"
    assert len(d_data["trends"]) > 0
    # Day bucket format: YYYY-MM-DD
    assert len(d_data["trends"][0]["date_bucket"]) == 10

    # Week
    resp_week = client.get("/api/history/trends?granularity=week")
    assert resp_week.status_code == 200
    w_data = resp_week.json()
    assert w_data["granularity"] == "week"
    assert len(w_data["trends"]) > 0
    assert "-W" in w_data["trends"][0]["date_bucket"]

    # Month
    resp_month = client.get("/api/history/trends?granularity=month")
    assert resp_month.status_code == 200
    m_data = resp_month.json()
    assert m_data["granularity"] == "month"
    assert len(m_data["trends"]) > 0
    assert len(m_data["trends"][0]["date_bucket"]) == 7  # YYYY-MM


def test_historical_calendar_endpoint():
    """GET /api/history/calendar returns daily heatmap cells with normalized intensity index."""
    resp = client.get("/api/history/calendar")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_days"] > 0
    assert len(data["days"]) == data["total_days"]

    day0 = data["days"][0]
    assert "date" in day0
    assert 0 <= day0["intensity_index"] <= 100
    assert day0["dominant_sensor"] in {"MODIS", "VIIRS", "COINCIDENT"}
    assert day0["modis_frp_mw"] >= 0.0
    assert day0["viirs_frp_mw"] >= 0.0


def test_historical_regions_endpoint():
    """GET /api/history/regions returns regional fire rollups and percentage shares."""
    resp = client.get("/api/history/regions")
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["regions"]) > 0
    total_pct = sum(r["percentage_of_total"] for r in data["regions"])
    # Percentages sum to approximately 100%
    assert 99.0 <= total_pct <= 101.0
    assert data["regions"][0]["event_count"] >= data["regions"][-1]["event_count"]


def test_historical_sensors_endpoint():
    """GET /api/history/sensors returns spacecraft platform metrics."""
    resp = client.get("/api/history/sensors")
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["sensors"]) > 0
    assert data["total_observations"] > 0
    assert data["modis_observation_count"] + data["viirs_observation_count"] == data["total_observations"]


def test_historical_events_pagination_and_filtering():
    """GET /api/history/events supports pagination and classification filter."""
    resp_p1 = client.get("/api/history/events?page=1&page_size=10")
    assert resp_p1.status_code == 200
    data_p1 = resp_p1.json()
    assert data_p1["page"] == 1
    assert data_p1["page_size"] == 10
    assert len(data_p1["events"]) <= 10

    resp_p2 = client.get("/api/history/events?page=2&page_size=10")
    assert resp_p2.status_code == 200
    data_p2 = resp_p2.json()
    if data_p1["total_events"] > 10:
        assert data_p2["events"][0]["id"] != data_p1["events"][0]["id"]

    # Classification filter
    resp_matched = client.get("/api/history/events?classification=MATCHED&page=1&page_size=50")
    assert resp_matched.status_code == 200
    for evt in resp_matched.json()["events"]:
        assert evt["classification"] == "MATCHED"


def test_historical_date_range_and_input_validation():
    """Rejects invalid date ranges, invalid calendar dates, and malformed bounding boxes."""
    # Invalid calendar date (Feb 31)
    resp_bad_date = client.get("/api/history/summary?start_date=2026-02-31")
    assert resp_bad_date.status_code == 400

    # start_date > end_date
    resp_inverted_dates = client.get("/api/history/summary?start_date=2026-10-01&end_date=2026-09-01")
    assert resp_inverted_dates.status_code == 400
    assert "cannot be after end_date" in resp_inverted_dates.json()["detail"]

    # Incomplete bounding box
    resp_partial_bbox = client.get("/api/history/summary?min_lon=10.0&min_lat=20.0")
    assert resp_partial_bbox.status_code == 400

    # Inverted bounding box
    resp_inverted_bbox = client.get("/api/history/summary?min_lon=20.0&min_lat=10.0&max_lon=10.0&max_lat=30.0")
    assert resp_inverted_bbox.status_code == 400


def test_idempotent_ingestion_and_deduplication(tmp_path):
    """
    Inserting the same record twice via HistoricalRepository must update existing record,
    without duplicate growth in total observation count.
    """
    test_db = str(tmp_path / "test_dedup.db")
    service = HistoricalService(db_path=test_db)

    obs = NormalizedObservation(
        id="DEDUP-TEST-001",
        latitude=10.5,
        longitude=20.5,
        acquisition_date="2026-05-01",
        acquisition_time_utc="12:00",
        satellite="Aqua",
        instrument="MODIS",
        sensor_source="MODIS_NRT",
        frp_mw=100.0,
    )

    # Baseline count before custom ingestion
    initial_count = service.repo.count_observations()

    # First ingestion
    resp1 = service.ingest_observations([obs], provenance="TEST_RUN_1")
    assert resp1.records_inserted == 1
    assert resp1.records_updated == 0
    assert service.repo.count_observations() == initial_count + 1

    # Second ingestion of the same record ID with updated FRP
    obs_updated = NormalizedObservation(
        id="DEDUP-TEST-001",
        latitude=10.5,
        longitude=20.5,
        acquisition_date="2026-05-01",
        acquisition_time_utc="12:00",
        satellite="Aqua",
        instrument="MODIS",
        sensor_source="MODIS_NRT",
        frp_mw=150.0,  # Updated FRP
    )
    resp2 = service.ingest_observations([obs_updated], provenance="TEST_RUN_2")
    assert resp2.records_inserted == 0
    assert resp2.records_updated == 1
    # Total count remains exactly initial_count + 1 (no duplicate creation!)
    assert service.repo.count_observations() == initial_count + 1

    # Verify updated value in storage
    stored = service.repo.query_observations()
    dedup_record = next(o for o in stored if o.id == "DEDUP-TEST-001")
    assert dedup_record.frp_mw == 150.0
