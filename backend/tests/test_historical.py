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

    assert data["data_source"] in {"DEMO_HISTORICAL_ARCHIVE", "NASA_FIRMS_LIVE_ARCHIVE", "MIXED_HISTORICAL_ARCHIVE"}
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


def test_calendar_strict_frp_separation_and_dimensionless_intensity():
    """
    Verifies that the fire activity calendar NEVER computes or displays a cross-sensor FRP sum.
    MODIS and VIIRS FRP must remain separated, and intensity_index must be dimensionless (0-100).
    """
    resp = client.get("/api/history/calendar")
    assert resp.status_code == 200
    data = resp.json()

    assert "max_daily_modis_frp_mw" in data
    assert "max_daily_viirs_frp_mw" in data
    assert "peak_single_frp_mw" in data
    assert data["max_daily_modis_frp_mw"] >= 0.0
    assert data["max_daily_viirs_frp_mw"] >= 0.0

    for day in data["days"]:
        assert 0 <= day["intensity_index"] <= 100
        m_frp = day["modis_frp_mw"]
        v_frp = day["viirs_frp_mw"]
        # If both instruments detected activity on the day, ensure no cross-sensor sum is present
        if m_frp > 0.0 and v_frp > 0.0:
            forbidden_cross_sum = m_frp + v_frp
            # No field on the day record may equal the cross-sensor sum
            for key, val in day.items():
                if isinstance(val, (int, float)) and key not in {"observation_count", "event_count"}:
                    assert val != forbidden_cross_sum, f"Field '{key}' on {day['date']} unlawfully summed MODIS and VIIRS FRP: {val}"


def test_provenance_empty_demo_live_mixed(tmp_path):
    """
    Verifies that provenance reporting correctly distinguishes empty,
    demo-only, live-only, and mixed-source storage states.
    """
    # 1. Empty storage
    empty_db = str(tmp_path / "empty.db")
    empty_service = HistoricalService(db_path=empty_db)
    prov_empty = empty_service._determine_provenance([])
    assert prov_empty["data_source"] == "EMPTY_ARCHIVE"
    assert prov_empty["is_live"] is False
    assert prov_empty["is_synthetic"] is False

    # 2. Demo-only observations
    demo_obs = [
        NormalizedObservation(
            id=f"DEMO-{i}",
            latitude=10.0,
            longitude=20.0,
            acquisition_date="2026-06-01",
            satellite="Terra",
            instrument="MODIS",
            sensor_source="MODIS_NRT",
            is_live=False,
        )
        for i in range(5)
    ]
    prov_demo = empty_service._determine_provenance(demo_obs)
    assert prov_demo["data_source"] == "DEMO_HISTORICAL_ARCHIVE"
    assert prov_demo["is_live"] is False
    assert prov_demo["is_synthetic"] is True

    # 3. Live-only observations
    live_obs = [
        NormalizedObservation(
            id=f"LIVE-{i}",
            latitude=10.0,
            longitude=20.0,
            acquisition_date="2026-06-01",
            satellite="NOAA-20",
            instrument="VIIRS",
            sensor_source="VIIRS_NOAA20_NRT",
            is_live=True,
        )
        for i in range(5)
    ]
    prov_live = empty_service._determine_provenance(live_obs)
    assert prov_live["data_source"] == "NASA_FIRMS_LIVE_ARCHIVE"
    assert prov_live["is_live"] is True
    assert prov_live["is_synthetic"] is False

    # 4. Mixed observations
    mixed_obs = demo_obs + live_obs
    prov_mixed = empty_service._determine_provenance(mixed_obs)
    assert prov_mixed["data_source"] == "MIXED_HISTORICAL_ARCHIVE"
    assert prov_mixed["is_live"] is False
    assert prov_mixed["is_synthetic"] is True
    assert "Live" in prov_mixed["provenance"] and "Synthetic" in prov_mixed["provenance"]


def test_ingestion_security_auth_and_bounds_validation():
    """
    Tests endpoint authentication, payload limits, provenance validation, and record bounds on POST /api/history/ingest.
    """
    from app.config import settings

    # Case 1: Locked when no ingestion key configured
    orig_key = settings.ingestion_api_key
    settings.ingestion_api_key = None
    try:
        resp_locked = client.post(
            "/api/history/ingest",
            json={"observations": [{"id": "TEST-1", "latitude": 10.0, "longitude": 20.0, "acquisition_date": "2026-06-01", "satellite": "Terra", "instrument": "MODIS", "sensor_source": "MODIS_NRT"}]},
        )
        assert resp_locked.status_code == 403

        # Configure secret key for subsequent checks
        settings.ingestion_api_key = "secure-test-key-xyz"

        # Case 2: Missing auth header
        resp_no_auth = client.post(
            "/api/history/ingest",
            json={"observations": [{"id": "TEST-1", "latitude": 10.0, "longitude": 20.0, "acquisition_date": "2026-06-01", "satellite": "Terra", "instrument": "MODIS", "sensor_source": "MODIS_NRT"}]},
        )
        assert resp_no_auth.status_code == 401

        # Case 3: Wrong auth key
        resp_bad_auth = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "wrong-key"},
            json={"observations": [{"id": "TEST-1", "latitude": 10.0, "longitude": 20.0, "acquisition_date": "2026-06-01", "satellite": "Terra", "instrument": "MODIS", "sensor_source": "MODIS_NRT"}]},
        )
        assert resp_bad_auth.status_code == 401

        # Case 4: Empty observations array
        resp_empty = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "secure-test-key-xyz"},
            json={"observations": []},
        )
        assert resp_empty.status_code == 400

        # Case 5: Exceeding batch size
        orig_batch = settings.max_ingestion_batch_size
        settings.max_ingestion_batch_size = 2
        try:
            large_batch = [
                {"id": f"T-{i}", "latitude": 10.0, "longitude": 20.0, "acquisition_date": "2026-06-01", "satellite": "Terra", "instrument": "MODIS", "sensor_source": "MODIS_NRT"}
                for i in range(5)
            ]
            resp_too_large = client.post(
                "/api/history/ingest",
                headers={"X-Ingestion-Key": "secure-test-key-xyz"},
                json={"observations": large_batch},
            )
            assert resp_too_large.status_code == 400
            assert "exceeds maximum allowed limit" in resp_too_large.json()["detail"]
        finally:
            settings.max_ingestion_batch_size = orig_batch

        # Case 6: Record bounds violation (lat > 90)
        resp_bad_lat = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "secure-test-key-xyz"},
            json={"observations": [{"id": "BAD-LAT", "latitude": 95.0, "longitude": 20.0, "acquisition_date": "2026-06-01", "satellite": "Terra", "instrument": "MODIS", "sensor_source": "MODIS_NRT"}]},
        )
        assert resp_bad_lat.status_code == 422
        assert "latitude" in resp_bad_lat.json()["detail"].lower()

        # Case 7: Invalid calendar date (Feb 30)
        resp_bad_date = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "secure-test-key-xyz"},
            json={"observations": [{"id": "BAD-DATE", "latitude": 10.0, "longitude": 20.0, "acquisition_date": "2026-02-30", "satellite": "Terra", "instrument": "MODIS", "sensor_source": "MODIS_NRT"}]},
        )
        assert resp_bad_date.status_code == 422

        # Case 8: Successful authenticated write
        import uuid
        unique_id = f"SECURE-INGEST-{uuid.uuid4().hex[:8]}"
        valid_rec = [
            {
                "id": unique_id,
                "latitude": 12.5,
                "longitude": 34.5,
                "acquisition_date": "2026-07-15",
                "acquisition_time_utc": "14:30",
                "satellite": "Aqua",
                "instrument": "MODIS",
                "sensor_source": "MODIS_NRT",
                "frp_mw": 85.0,
            }
        ]
        resp_ok = client.post(
            "/api/history/ingest",
            headers={"Authorization": "Bearer secure-test-key-xyz"},
            json={"observations": valid_rec, "provenance": "TEST_VALID_BATCH"},
        )
        assert resp_ok.status_code == 200
        assert resp_ok.json()["status"] == "SUCCESS"
        assert resp_ok.json()["records_inserted"] == 1

    finally:
        settings.ingestion_api_key = orig_key


def test_deployment_persistence_custom_database_path(tmp_path):
    """
    Verifies that initializing SQLite with a nested absolute mount path
    automatically creates parent directories and initializes the database.
    """
    from app.db.database import init_db

    mount_dir = tmp_path / "var" / "data" / "agninet"
    mount_db = str(mount_dir / "persisted_fires.db")

    assert not mount_dir.exists()
    init_db(mount_db)
    assert mount_dir.exists()
    assert (mount_dir / "persisted_fires.db").exists()

    service = HistoricalService(db_path=mount_db)
    count = service.repo.count_observations()
    assert count >= 0


def test_provenance_spoofing_prevention():
    """
    Proves that a client cannot promote manual or synthetic records to NASA live data.
    Server-authoritative provenance overrides client is_live claims and rejects spoofed tokens.
    """
    import uuid
    from app.config import settings

    orig_ingest_key = settings.ingestion_api_key
    orig_nasa_key = settings.nasa_archive_ingestion_key
    settings.ingestion_api_key = "ingest-key-123"
    settings.nasa_archive_ingestion_key = "nasa-vault-token-xyz"

    try:
        # Case 1: Client sends is_live=True on manual ingestion -> server must override is_live=False
        fake_live_id = f"SPOOF-ATTEMPT-{uuid.uuid4().hex[:8]}"
        payload_manual_claim = {
            "ingestion_source": "MANUAL",
            "provenance": "MANUAL_BATCH",
            "observations": [
                {
                    "id": fake_live_id,
                    "latitude": 15.0,
                    "longitude": 25.0,
                    "acquisition_date": "2026-08-10",
                    "satellite": "Aqua",
                    "instrument": "MODIS",
                    "sensor_source": "MODIS_NRT",
                    "is_live": True,  # Client attempts to spoof live status!
                }
            ],
        }
        resp = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "ingest-key-123"},
            json=payload_manual_claim,
        )
        assert resp.status_code == 200

        # Query database directly to verify stored record has is_live=False
        from app.services.historical_service import historical_service
        stored = historical_service.repo.query_observations()
        record = next((o for o in stored if o.id == fake_live_id), None)
        assert record is not None
        assert record.is_live is False, "Server unlawfully trusted client-supplied is_live=True!"
        assert "is_live forced to False" in record.raw_fields.get("server_provenance_enforced", "")

        # Case 2: Client claims VERIFIED_NASA_ARCHIVE without valid NASA archive token -> 403 Forbidden
        payload_unauth_nasa = {
            "ingestion_source": "VERIFIED_NASA_ARCHIVE",
            "provenance": "NASA_ARCHIVE_BATCH",
            "observations": [
                {
                    "id": f"UNAUTH-NASA-{uuid.uuid4().hex[:8]}",
                    "latitude": 15.0,
                    "longitude": 25.0,
                    "acquisition_date": "2026-08-10",
                    "satellite": "Aqua",
                    "instrument": "MODIS",
                    "sensor_source": "MODIS_NRT",
                }
            ],
        }
        resp_unauth = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "ingest-key-123", "X-NASA-Archive-Token": "bad-token"},
            json=payload_unauth_nasa,
        )
        assert resp_unauth.status_code == 403
        assert "requires valid X-NASA-Archive-Token" in resp_unauth.json()["detail"]

        # Case 3: Client attempts to pass NASA live provenance with non-NASA source -> 422 Unprocessable
        payload_conflicting = {
            "ingestion_source": "MANUAL",
            "provenance": "NASA_FIRMS_LIVE_SPOOF",
            "observations": [
                {
                    "id": f"CONFLICT-{uuid.uuid4().hex[:8]}",
                    "latitude": 15.0,
                    "longitude": 25.0,
                    "acquisition_date": "2026-08-10",
                    "satellite": "Aqua",
                    "instrument": "MODIS",
                    "sensor_source": "MODIS_NRT",
                }
            ],
        }
        resp_conflict = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "ingest-key-123"},
            json=payload_conflicting,
        )
        assert resp_conflict.status_code == 422
        assert "Non-NASA ingestion source cannot claim NASA live archive provenance" in resp_conflict.json()["detail"]

        # Case 4: Valid NASA archive workflow with token -> successfully persists is_live=True
        valid_nasa_id = f"VALID-NASA-{uuid.uuid4().hex[:8]}"
        payload_valid_nasa = {
            "ingestion_source": "VERIFIED_NASA_ARCHIVE",
            "provenance": "NASA_LANCE_ARCHIVE",
            "observations": [
                {
                    "id": valid_nasa_id,
                    "latitude": -10.0,
                    "longitude": -55.0,
                    "acquisition_date": "2026-08-10",
                    "satellite": "NOAA-20",
                    "instrument": "VIIRS",
                    "sensor_source": "VIIRS_NOAA20_NRT",
                    "is_live": True,
                }
            ],
        }
        resp_valid_nasa = client.post(
            "/api/history/ingest",
            headers={"X-Ingestion-Key": "ingest-key-123", "X-NASA-Archive-Token": "nasa-vault-token-xyz"},
            json=payload_valid_nasa,
        )
        assert resp_valid_nasa.status_code == 200
        stored_nasa = next((o for o in historical_service.repo.query_observations() if o.id == valid_nasa_id), None)
        assert stored_nasa is not None
        assert stored_nasa.is_live is True, "Legitimate NASA archive ingestion must have is_live=True"

    finally:
        settings.ingestion_api_key = orig_ingest_key
        settings.nasa_archive_ingestion_key = orig_nasa_key


def test_render_blueprint_deployment_configuration():
    """
    Verifies that root render.yaml is present, valid YAML, and configures
    temporary free-tier deployment without persistent disk declarations,
    using /tmp/agninet_historical.db for SQLite and secure secret generation.
    """
    import os
    import yaml
    from app.services.historical_service import HistoricalRepository

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    render_yaml_path = os.path.join(repo_root, "render.yaml")

    assert os.path.isfile(render_yaml_path), "render.yaml must exist at repository root."

    with open(render_yaml_path, "r", encoding="utf-8") as f:
        blueprint = yaml.safe_load(f)

    assert "services" in blueprint
    services = blueprint["services"]
    assert len(services) >= 1

    api_service = next((s for s in services if s.get("name") in {"agninet-api", "agninet-backend"}), None)
    assert api_service is not None, "render.yaml must define agninet-api service."

    # Verify free plan and absence of disk declaration (Render free tier does not support persistent disks)
    assert api_service.get("plan") == "free", "Backend service must use free plan for temporary deployment."
    assert "disk" not in api_service, "Backend service must not declare disk on free plan."

    # Verify environment variables
    env_vars = {item["key"]: item for item in api_service.get("envVars", [])}
    assert "DATABASE_PATH" in env_vars
    assert env_vars["DATABASE_PATH"]["value"] == "/tmp/agninet_historical.db"
    assert env_vars.get("ENVIRONMENT", {}).get("value") == "production"
    assert "DATABASE_URL" not in env_vars, "DATABASE_URL must not be defined for SQLite deployment."

    # Verify secrets use generateValue or sync:false (NO raw secret strings)
    assert env_vars.get("INGESTION_API_KEY", {}).get("generateValue") is True
    assert env_vars.get("NASA_ARCHIVE_INGESTION_KEY", {}).get("generateValue") is True
    assert env_vars.get("NASA_FIRMS_MAP_KEY", {}).get("sync") is False

    # Ensure SQLite initializes successfully at /tmp/agninet_historical.db
    from app.db.database import get_db_connection, init_db
    init_db("/tmp/agninet_historical.db")
    with get_db_connection("/tmp/agninet_historical.db") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        assert "historical_observations" in tables
        assert "ingestion_logs" in tables
