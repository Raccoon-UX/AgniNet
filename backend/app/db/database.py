import os
import sqlite3
from contextlib import contextmanager
from typing import Generator, Optional
from app.config import settings


def get_db_path() -> str:
    """Returns absolute path to SQLite database, ensuring parent directory exists."""
    path = settings.database_path
    if not os.path.isabs(path):
        # Resolve relative to project root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def init_db(db_path: Optional[str] = None) -> None:
    """Initializes SQLite database schema and indices."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")

    with conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS historical_observations (
                id TEXT PRIMARY KEY,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                acquisition_date TEXT NOT NULL,
                acquisition_time_utc TEXT,
                satellite TEXT NOT NULL,
                instrument TEXT NOT NULL,
                sensor_source TEXT NOT NULL,
                confidence_numeric REAL,
                confidence TEXT,
                frp_mw REAL,
                brightness_kelvin REAL,
                bright_t31_kelvin REAL,
                scan_angle REAL,
                track_km REAL,
                day_night TEXT,
                region TEXT,
                is_live INTEGER NOT NULL,
                source_provenance TEXT NOT NULL,
                ingested_at TEXT NOT NULL,
                raw_fields_json TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_hist_date ON historical_observations (acquisition_date);
            CREATE INDEX IF NOT EXISTS idx_hist_coords ON historical_observations (latitude, longitude);
            CREATE INDEX IF NOT EXISTS idx_hist_instrument ON historical_observations (instrument);
            CREATE INDEX IF NOT EXISTS idx_hist_satellite ON historical_observations (satellite);
            CREATE INDEX IF NOT EXISTS idx_hist_region ON historical_observations (region);
            CREATE INDEX IF NOT EXISTS idx_hist_provenance ON historical_observations (source_provenance);

            CREATE TABLE IF NOT EXISTS ingestion_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ingested_at TEXT NOT NULL,
                provenance TEXT NOT NULL,
                records_count INTEGER NOT NULL,
                status TEXT NOT NULL
            );
        """)
    conn.close()


@contextmanager
def get_db_connection(db_path: Optional[str] = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager providing managed SQLite connection with dict-like row access."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
