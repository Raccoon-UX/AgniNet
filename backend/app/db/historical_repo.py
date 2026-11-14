import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.db.database import get_db_connection
from app.models.fire import NormalizedObservation


class HistoricalRepository:
    """Data access repository for persisted satellite active fire observations."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path

    def upsert_observations(
        self,
        observations: List[NormalizedObservation],
        provenance: str = "NASA_FIRMS_ARCHIVE",
    ) -> Tuple[int, int]:
        """
        Idempotently inserts or updates normalized observations.
        Deduplication key is observation.id.
        Returns (inserted_count, updated_count).
        """
        if not observations:
            return 0, 0

        now_utc = datetime.now(timezone.utc).isoformat()
        inserted = 0
        updated = 0

        with get_db_connection(self.db_path) as conn:
            for obs in observations:
                # Check existence to count inserted vs updated
                existing = conn.execute(
                    "SELECT id FROM historical_observations WHERE id = ?;", (obs.id,)
                ).fetchone()

                raw_json = json.dumps(obs.raw_fields) if obs.raw_fields else "{}"

                conn.execute(
                    """
                    INSERT INTO historical_observations (
                        id, latitude, longitude, acquisition_date, acquisition_time_utc,
                        satellite, instrument, sensor_source, confidence_numeric, confidence,
                        frp_mw, brightness_kelvin, bright_t31_kelvin, scan_angle, track_km,
                        day_night, region, is_live, source_provenance, ingested_at, raw_fields_json
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?
                    )
                    ON CONFLICT(id) DO UPDATE SET
                        latitude=excluded.latitude,
                        longitude=excluded.longitude,
                        acquisition_date=excluded.acquisition_date,
                        acquisition_time_utc=excluded.acquisition_time_utc,
                        satellite=excluded.satellite,
                        instrument=excluded.instrument,
                        sensor_source=excluded.sensor_source,
                        confidence_numeric=excluded.confidence_numeric,
                        confidence=excluded.confidence,
                        frp_mw=excluded.frp_mw,
                        brightness_kelvin=excluded.brightness_kelvin,
                        bright_t31_kelvin=excluded.bright_t31_kelvin,
                        scan_angle=excluded.scan_angle,
                        track_km=excluded.track_km,
                        day_night=excluded.day_night,
                        region=excluded.region,
                        is_live=excluded.is_live,
                        source_provenance=excluded.source_provenance,
                        ingested_at=excluded.ingested_at,
                        raw_fields_json=excluded.raw_fields_json;
                    """,
                    (
                        obs.id,
                        obs.latitude,
                        obs.longitude,
                        obs.acquisition_date,
                        obs.acquisition_time_utc,
                        obs.satellite,
                        obs.instrument,
                        obs.sensor_source,
                        obs.confidence_numeric,
                        str(obs.confidence) if obs.confidence is not None else None,
                        obs.frp_mw,
                        obs.brightness_kelvin,
                        obs.bright_t31_kelvin,
                        obs.scan_angle,
                        obs.track_km,
                        obs.day_night,
                        obs.region,
                        1 if obs.is_live else 0,
                        provenance,
                        now_utc,
                        raw_json,
                    ),
                )

                if existing:
                    updated += 1
                else:
                    inserted += 1

            # Log ingestion batch
            conn.execute(
                """
                INSERT INTO ingestion_logs (ingested_at, provenance, records_count, status)
                VALUES (?, ?, ?, ?);
                """,
                (now_utc, provenance, len(observations), "SUCCESS"),
            )

        return inserted, updated

    def count_observations(self) -> int:
        """Returns total observations stored in the repository."""
        with get_db_connection(self.db_path) as conn:
            row = conn.execute("SELECT COUNT(*) AS total FROM historical_observations;").fetchone()
            return row["total"] if row else 0

    def query_observations(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        instrument: Optional[str] = None,
        satellite: Optional[str] = None,
        region: Optional[str] = None,
        min_frp: Optional[float] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[NormalizedObservation]:
        """Queries persisted historical observations with flexible filters."""
        query = "SELECT * FROM historical_observations WHERE 1=1"
        params: List[Any] = []

        if start_date:
            query += " AND acquisition_date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND acquisition_date <= ?"
            params.append(end_date)
        if min_lat is not None:
            query += " AND latitude >= ?"
            params.append(min_lat)
        if max_lat is not None:
            query += " AND latitude <= ?"
            params.append(max_lat)
        if min_lon is not None:
            query += " AND longitude >= ?"
            params.append(min_lon)
        if max_lon is not None:
            query += " AND longitude <= ?"
            params.append(max_lon)
        if instrument:
            query += " AND instrument = ?"
            params.append(instrument)
        if satellite:
            query += " AND satellite = ?"
            params.append(satellite)
        if region:
            query += " AND region LIKE ?"
            params.append(f"%{region}%")
        if min_frp is not None:
            query += " AND frp_mw >= ?"
            params.append(min_frp)

        query += " ORDER BY acquisition_date ASC, acquisition_time_utc ASC"

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)
            if offset is not None:
                query += " OFFSET ?"
                params.append(offset)

        observations: List[NormalizedObservation] = []
        with get_db_connection(self.db_path) as conn:
            cursor = conn.execute(query, params)
            for row in cursor.fetchall():
                try:
                    raw_dict = json.loads(row["raw_fields_json"]) if row["raw_fields_json"] else {}
                except Exception:
                    raw_dict = {}

                obs = NormalizedObservation(
                    id=row["id"],
                    latitude=row["latitude"],
                    longitude=row["longitude"],
                    acquisition_date=row["acquisition_date"],
                    acquisition_time_utc=row["acquisition_time_utc"],
                    satellite=row["satellite"],
                    instrument=row["instrument"],
                    sensor_source=row["sensor_source"],
                    confidence=row["confidence"],
                    confidence_numeric=row["confidence_numeric"],
                    frp_mw=row["frp_mw"],
                    brightness_kelvin=row["brightness_kelvin"],
                    bright_t31_kelvin=row["bright_t31_kelvin"],
                    scan_angle=row["scan_angle"],
                    track_km=row["track_km"],
                    day_night=row["day_night"],
                    region=row["region"],
                    is_live=bool(row["is_live"]),
                    raw_fields=raw_dict,
                )
                observations.append(obs)

        return observations

    def get_date_bounds(self) -> Tuple[Optional[str], Optional[str]]:
        """Returns earliest and latest calendar dates in storage."""
        with get_db_connection(self.db_path) as conn:
            row = conn.execute(
                "SELECT MIN(acquisition_date) AS min_d, MAX(acquisition_date) AS max_d FROM historical_observations;"
            ).fetchone()
            if row and row["min_d"] and row["max_d"]:
                return row["min_d"], row["max_d"]
            return None, None

    def get_distinct_satellites(self) -> List[str]:
        """Returns list of distinct satellites in storage."""
        with get_db_connection(self.db_path) as conn:
            rows = conn.execute(
                "SELECT DISTINCT satellite FROM historical_observations ORDER BY satellite;"
            ).fetchall()
            return [r["satellite"] for r in rows if r["satellite"]]

    def get_distinct_regions(self) -> List[str]:
        """Returns list of distinct regions in storage."""
        with get_db_connection(self.db_path) as conn:
            rows = conn.execute(
                "SELECT DISTINCT region FROM historical_observations WHERE region IS NOT NULL ORDER BY region;"
            ).fetchall()
            return [r["region"] for r in rows if r["region"]]
