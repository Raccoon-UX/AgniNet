from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator


class NormalizedObservation(BaseModel):
    """
    Normalized observation schema across NASA MODIS (1km) and VIIRS (375m) active fire datasets.
    Preserves raw instrument telemetry without fabricating missing values.
    """
    id: str = Field(description="Unique record identifier")
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    acquisition_date: str = Field(description="Date string formatted as YYYY-MM-DD")
    acquisition_time_utc: Optional[str] = Field(
        default=None,
        description="Acquisition time formatted as HH:MM (null if missing from telemetry)"
    )
    satellite: str = Field(description="Platform (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21, etc.)")
    instrument: Literal["MODIS", "VIIRS", "OTHER"]
    sensor_source: str = Field(description="FIRMS source identifier e.g. MODIS_NRT, VIIRS_SNPP_NRT")
    confidence: Optional[Union[float, int, str]] = Field(
        default=None,
        description="Raw confidence value: 0-100% for MODIS; 'low', 'nominal', 'high' or numeric for VIIRS"
    )
    confidence_numeric: Optional[float] = Field(
        default=None,
        description="Standardized 0-100 numeric confidence if available (null if missing, never fabricated)"
    )
    frp_mw: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Fire Radiative Power in Megawatts (MW)"
    )
    brightness_kelvin: Optional[float] = Field(
        default=None,
        description="Primary thermal brightness temperature in Kelvin (MODIS Band 21/22 or VIIRS I4)"
    )
    bright_t31_kelvin: Optional[float] = Field(
        default=None,
        description="Background thermal brightness temperature in Kelvin (MODIS Band 31 or VIIRS I5)"
    )
    scan_angle: Optional[float] = Field(default=None, description="Along-scan pixel dimension (km) or angle")
    track_km: Optional[float] = Field(default=None, description="Along-track pixel dimension (km)")
    day_night: Optional[Literal["D", "N"]] = Field(default=None, description="D = Day, N = Night")
    version: Optional[str] = Field(default=None, description="FIRMS processing collection/version")
    region: Optional[str] = Field(default=None, description="Geographic locality / country if available")
    is_live: bool = Field(default=False, description="True if real NASA FIRMS telemetry, False if demo fixture")
    raw_fields: Dict[str, Any] = Field(default_factory=dict, description="Preserved original raw sensor fields")

    @field_validator("acquisition_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            d = datetime.strptime(v, "%Y-%m-%d")
            if d.year < 1990 or d.year > 2100:
                raise ValueError("Year out of realistic satellite operational bounds")
            return v
        except Exception as e:
            raise ValueError(f"Invalid acquisition_date: '{v}'. Must be a valid YYYY-MM-DD calendar date.") from e

    @field_validator("acquisition_time_utc")
    @classmethod
    def validate_time(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError(f"Invalid acquisition_time_utc: '{v}'. Must be HH:MM.")
        try:
            h, m = int(parts[0]), int(parts[1])
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise ValueError(f"Time out of 00:00–23:59 range: '{v}'")
            return f"{h:02d}:{m:02d}"
        except Exception as e:
            raise ValueError(f"Invalid acquisition_time_utc: '{v}'") from e


class ObservationKpis(BaseModel):
    total_hotspots: int
    modis_count: int
    viirs_count: int
    total_frp_mw: float
    avg_confidence: Optional[float] = None
    max_frp_mw: Optional[float] = None
    daytime_count: int
    nighttime_count: int
    detected_satellites: List[str] = Field(
        default_factory=list,
        description="Physical satellite platforms confirmed present in observations"
    )


class FireObservationsResponse(BaseModel):
    is_live: bool = Field(description="True if data was fetched live from NASA FIRMS API")
    data_source: Literal["NASA_FIRMS_LIVE", "DEMO_FIXTURES"]
    status: Literal["healthy", "degraded", "demo_fallback"] = Field(
        default="healthy",
        description="Feed health status: 'healthy', 'degraded' (partial failure), or 'demo_fallback'"
    )
    is_partial: bool = Field(
        default=False,
        description="True if one or more requested sensor feeds failed while others succeeded"
    )
    succeeded_sources: List[str] = Field(default_factory=list)
    failed_sources: List[str] = Field(default_factory=list)
    active_feed_count: int = Field(default=0, description="Count of successfully queried FIRMS feeds")
    total_feed_count: int = Field(default=4, description="Total configured FIRMS feeds (4)")
    detected_platform_count: int = Field(default=0, description="Physical platforms with confirmed detections")
    total_platform_count: int = Field(default=5, description="Total constellation platforms (5)")
    detected_satellites: List[str] = Field(default_factory=list)
    fetched_at: str
    total_count: int
    observations: List[NormalizedObservation]
    kpis: ObservationKpis
    attribution: str = "NASA FIRMS (LANCE/EOSDIS) & AgniNet Unified Processing"
    notice: Optional[str] = None
    bounding_box: Optional[List[float]] = None
    applied_source: str
