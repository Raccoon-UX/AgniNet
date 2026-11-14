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
    acquisition_time_utc: str = Field(description="Acquisition time formatted as HH:MM")
    satellite: str = Field(description="Platform (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21, etc.)")
    instrument: Literal["MODIS", "VIIRS", "OTHER"]
    sensor_source: str = Field(description="FIRMS source identifier e.g. MODIS_NRT, VIIRS_SNPP_NRT")
    confidence: Optional[Union[float, int, str]] = Field(
        default=None,
        description="Confidence value: 0-100% for MODIS; 'low', 'nominal', 'high' or numeric for VIIRS"
    )
    confidence_numeric: Optional[float] = Field(
        default=None,
        description="Standardized 0-100 numeric confidence if available or mapped (low=25, nominal=65, high=90)"
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


class ObservationKpis(BaseModel):
    total_hotspots: int
    modis_count: int
    viirs_count: int
    total_frp_mw: float
    avg_confidence: Optional[float] = None
    max_frp_mw: Optional[float] = None
    daytime_count: int
    nighttime_count: int


class FireObservationsResponse(BaseModel):
    is_live: bool = Field(description="True if data was fetched live from NASA FIRMS API")
    data_source: Literal["NASA_FIRMS_LIVE", "DEMO_FIXTURES"]
    fetched_at: str
    total_count: int
    observations: List[NormalizedObservation]
    kpis: ObservationKpis
    attribution: str = "NASA FIRMS (LANCE/EOSDIS) & AgniNet Unified Processing"
    notice: Optional[str] = None
    bounding_box: Optional[List[float]] = None
    applied_source: str
