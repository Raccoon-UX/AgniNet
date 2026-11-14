from typing import List, Optional
from pydantic import BaseModel


class SensorInfo(BaseModel):
    source_id: str
    name: str
    instrument: str
    platforms: List[str]
    spatial_resolution: str
    nrt_latency: str
    is_available: bool
    status: str
    description: str


class SensorAvailabilityResponse(BaseModel):
    is_firms_configured: bool
    supported_sources: List[SensorInfo]
    default_source: str = "VIIRS_NOAA20_NRT"
    data_mode: str  # "LIVE_CONFIGURED" or "DEMO_FALLBACK"


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    version: str
    nasa_firms_configured: bool
    data_mode: str  # "LIVE_CONFIGURED" | "DEMO_FALLBACK"
    cache_entries: int
    timestamp_utc: str
    upstream_firms_endpoint: str
    message: str
