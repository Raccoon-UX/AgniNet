from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.models.harmonization import HarmonizedEvent


class HistoricalSummary(BaseModel):
    """Statistical summary roll-up for historical active fire archives."""
    total_events: int = Field(description="Total harmonized unified fire events in time window")
    total_observations: int = Field(description="Total raw satellite observations (MODIS + VIIRS)")
    matched_events: int = Field(description="Events confirmed with dual-sensor support")
    modis_only_events: int = Field(description="Coarse-resolution detections without VIIRS match")
    viirs_only_events: int = Field(description="High-resolution detections without MODIS match")
    ambiguous_events: int = Field(description="Contested candidate associations or temporal uncertainty")
    
    # FRP metrics strictly separated by sensor instrument (NEVER combined)
    modis_frp_gigawatts: float = Field(description="Total Fire Radiative Power measured by MODIS (GW)")
    viirs_frp_gigawatts: float = Field(description="Total Fire Radiative Power measured by VIIRS (GW)")
    
    average_match_score: Optional[float] = Field(default=None, description="Average heuristic match score (0-1.0)")
    peak_day: Optional[str] = Field(default=None, description="Calendar date of peak fire event count (YYYY-MM-DD)")
    peak_day_events: int = Field(default=0, description="Number of events on the peak day")
    date_range_start: str = Field(description="Earliest observation date in historical query (YYYY-MM-DD)")
    date_range_end: str = Field(description="Latest observation date in historical query (YYYY-MM-DD)")
    active_platforms: List[str] = Field(default_factory=list, description="Active spacecraft platforms observed")
    data_source: str = Field(description="Source identifier (e.g. NASA_FIRMS_ARCHIVE, DEMO_HISTORICAL_FIXTURE)")
    is_live: bool = Field(description="True if real NASA telemetry archive, False if demo fixture")
    is_synthetic: bool = Field(default=False, description="True if any observations in response are synthetic fixtures")
    provenance: str = Field(description="Audit trail of data origin and pipeline version")


class HistoricalTrendPoint(BaseModel):
    """Aggregate time-series bucket for historical fire activity trends."""
    date_bucket: str = Field(description="Time bucket key: YYYY-MM-DD for day, YYYY-Www for week, YYYY-MM for month")
    event_count: int = Field(description="Harmonized unified event count in bucket")
    observation_count: int = Field(description="Raw observation count in bucket")
    matched_count: int = Field(description="Dual-sensor matched event count")
    modis_only_count: int = Field(description="MODIS-only event count")
    viirs_only_count: int = Field(description="VIIRS-only event count")
    ambiguous_count: int = Field(description="Ambiguous cluster count")
    
    # Radiative energy strictly preserved per sensor instrument
    modis_frp_mw: float = Field(default=0.0, description="Total MODIS Fire Radiative Power (MW)")
    viirs_frp_mw: float = Field(default=0.0, description="Total VIIRS Fire Radiative Power (MW)")
    average_confidence: Optional[float] = Field(default=None, description="Average detection confidence in bucket")


class HistoricalTrendsResponse(BaseModel):
    granularity: Literal["day", "week", "month"] = Field(description="Temporal aggregation interval")
    total_buckets: int = Field(description="Number of trend intervals returned")
    trends: List[HistoricalTrendPoint] = Field(default_factory=list)
    data_source: str
    is_live: bool
    is_synthetic: bool = Field(default=False, description="True if any observations in response are synthetic fixtures")
    provenance: str
    fetched_at: str


class HistoricalCalendarDay(BaseModel):
    """Calendar matrix cell representing daily thermal activity."""
    date: str = Field(description="Calendar date (YYYY-MM-DD)")
    event_count: int = Field(description="Total harmonized events on this date")
    observation_count: int = Field(description="Total raw observations on this date")
    intensity_index: int = Field(ge=0, le=100, description="Normalized thermal intensity index (0 to 100)")
    dominant_sensor: str = Field(description="Dominant sensor instrument on date ('MODIS', 'VIIRS', or 'COINCIDENT')")
    modis_count: int = Field(description="MODIS observation count")
    viirs_count: int = Field(description="VIIRS observation count")
    modis_frp_mw: float = Field(description="Total MODIS FRP (MW)")
    viirs_frp_mw: float = Field(description="Total VIIRS FRP (MW)")
    peak_frp_mw: float = Field(description="Maximum single-event FRP observed on date")


class HistoricalCalendarResponse(BaseModel):
    days: List[HistoricalCalendarDay] = Field(default_factory=list)
    total_days: int
    max_daily_events: int
    max_daily_modis_frp_mw: float = Field(default=0.0, description="Peak daily cumulative MODIS FRP (MW)")
    max_daily_viirs_frp_mw: float = Field(default=0.0, description="Peak daily cumulative VIIRS FRP (MW)")
    peak_single_frp_mw: float = Field(default=0.0, description="Peak single-observation FRP (MW) observed")
    max_daily_frp_mw: Optional[float] = Field(
        default=None,
        description="Deprecated: Use max_daily_modis_frp_mw and max_daily_viirs_frp_mw. Never cross-sensor summed."
    )
    date_range_start: str
    date_range_end: str
    data_source: str
    is_live: bool
    is_synthetic: bool = Field(default=False, description="True if any observations in response are synthetic fixtures")
    provenance: str
    fetched_at: str


class HistoricalRegionStat(BaseModel):
    region_name: str = Field(description="Geographic locality / fire biome name")
    event_count: int = Field(description="Total unified events in region")
    observation_count: int = Field(description="Total raw observations in region")
    matched_count: int = Field(description="Dual-sensor matched events in region")
    modis_frp_mw: float = Field(description="Total MODIS FRP (MW) in region")
    viirs_frp_mw: float = Field(description="Total VIIRS FRP (MW) in region")
    percentage_of_total: float = Field(description="Percentage share of global fire events in window")


class HistoricalRegionsResponse(BaseModel):
    regions: List[HistoricalRegionStat] = Field(default_factory=list)
    total_events: int
    data_source: str
    is_live: bool
    is_synthetic: bool = Field(default=False, description="True if any observations in response are synthetic fixtures")
    provenance: str
    fetched_at: str


class HistoricalSensorStat(BaseModel):
    satellite: str = Field(description="Spacecraft name (Aqua, Terra, Suomi-NPP, NOAA-20, NOAA-21)")
    instrument: str = Field(description="Instrument family ('MODIS' or 'VIIRS')")
    sensor_source: str = Field(description="FIRMS source identifier")
    observation_count: int = Field(description="Total observations recorded by this platform")
    share_percentage: float = Field(description="Percentage of all observations in window")
    daytime_count: int = Field(description="Daytime pass observation count")
    nighttime_count: int = Field(description="Nighttime pass observation count")
    total_frp_mw: float = Field(description="Total Fire Radiative Power measured by platform (MW)")
    mean_frp_mw: Optional[float] = Field(default=None, description="Average FRP per detection")
    max_frp_mw: Optional[float] = Field(default=None, description="Maximum FRP detection")
    average_confidence: Optional[float] = Field(default=None, description="Average detection confidence")


class HistoricalSensorsResponse(BaseModel):
    sensors: List[HistoricalSensorStat] = Field(default_factory=list)
    total_observations: int
    modis_observation_count: int
    viirs_observation_count: int
    data_source: str
    is_live: bool
    is_synthetic: bool = Field(default=False, description="True if any observations in response are synthetic fixtures")
    provenance: str
    fetched_at: str


class HistoricalEventsResponse(BaseModel):
    events: List[HarmonizedEvent] = Field(default_factory=list)
    total_events: int
    page: int
    page_size: int
    total_pages: int
    data_source: str
    is_live: bool
    is_synthetic: bool = Field(default=False, description="True if any observations in response are synthetic fixtures")
    provenance: str
    fetched_at: str


class HistoricalIngestionRequest(BaseModel):
    observations: List[Dict[str, Any]] = Field(description="Raw or normalized observation records to ingest")
    provenance: str = Field(default="MANUAL_INGESTION", description="Data source provenance identifier")
    replace_existing: bool = Field(default=True, description="Whether to update on duplicate record ID")


class HistoricalIngestionResponse(BaseModel):
    status: str
    records_received: int
    records_inserted: int
    records_updated: int
    timestamp_utc: str
    provenance: str
