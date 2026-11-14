from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    app_name: str = "AgniNet NASA FIRMS Live Service"
    app_version: str = "0.2.0-phase2"
    environment: str = "development"
    debug: bool = False

    # NASA FIRMS API Key (Secret: never leaked to client)
    nasa_firms_map_key: Optional[str] = Field(default=None, alias="NASA_FIRMS_MAP_KEY")
    firms_base_url: str = "https://firms.modaps.eosdis.nasa.gov/api"

    # Performance, resilience & caching
    cache_ttl_seconds: int = 300  # 5 minutes in-memory cache per source/extent/date
    request_timeout_seconds: float = 15.0
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Limit maximum records returned per query to avoid browser overload
    max_records_per_response: int = 2500

    # Historical Database Storage (SQLite persistent store)
    database_path: str = Field(default="backend/data/agninet_historical.db", alias="DATABASE_PATH")

    # Ingestion Security & Limits
    ingestion_api_key: Optional[str] = Field(default=None, alias="INGESTION_API_KEY")
    nasa_archive_ingestion_key: Optional[str] = Field(default=None, alias="NASA_ARCHIVE_INGESTION_KEY")
    max_ingestion_batch_size: int = Field(default=1000, alias="MAX_INGESTION_BATCH_SIZE")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_firms_configured(self) -> bool:
        """Returns True only if a valid non-placeholder NASA FIRMS MAP_KEY is present."""
        if not self.nasa_firms_map_key:
            return False
        clean = self.nasa_firms_map_key.strip()
        if len(clean) < 16:
            return False
        if clean.lower() in {"your_firms_map_key_here", "demo", "none", "placeholder"}:
            return False
        return True


settings = Settings()
