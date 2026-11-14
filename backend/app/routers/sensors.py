from fastapi import APIRouter
from app.config import settings
from app.models.health import SensorAvailabilityResponse, SensorInfo

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])

SUPPORTED_SOURCES = [
    SensorInfo(
        source_id="VIIRS_NOAA20_NRT",
        name="VIIRS NOAA-20 (JPSS-1) NRT",
        instrument="VIIRS",
        platforms=["NOAA-20"],
        spatial_resolution="375m (I-Bands)",
        nrt_latency="~2 to 3 hours from satellite pass",
        is_available=True,
        status="Operational",
        description="High-resolution active fire detection with restrained scan-angle footprint expansion.",
    ),
    SensorInfo(
        source_id="VIIRS_NOAA21_NRT",
        name="VIIRS NOAA-21 (JPSS-2) NRT",
        instrument="VIIRS",
        platforms=["NOAA-21"],
        spatial_resolution="375m (I-Bands)",
        nrt_latency="~2 to 3 hours from satellite pass",
        is_available=True,
        status="Operational",
        description="Latest JPSS thermal imaging radiometer active fire product.",
    ),
    SensorInfo(
        source_id="VIIRS_SNPP_NRT",
        name="VIIRS Suomi-NPP NRT",
        instrument="VIIRS",
        platforms=["Suomi-NPP"],
        spatial_resolution="375m (I-Bands)",
        nrt_latency="~2 to 3 hours from satellite pass",
        is_available=True,
        status="Operational",
        description="Pioneering 375m active fire detection dataset operating continuously since 2012.",
    ),
    SensorInfo(
        source_id="MODIS_NRT",
        name="MODIS Terra & Aqua NRT",
        instrument="MODIS",
        platforms=["Terra (EOS AM-1)", "Aqua (EOS PM-1)"],
        spatial_resolution="1000m (1 km)",
        nrt_latency="~2 to 4 hours from satellite pass",
        is_available=True,
        status="Operational",
        description="Global continuous climate baseline thermal anomaly product using MOD14/MYD14 algorithms.",
    ),
]


@router.get("", response_model=SensorAvailabilityResponse)
async def list_sensor_availability() -> SensorAvailabilityResponse:
    is_conf = settings.is_firms_configured
    return SensorAvailabilityResponse(
        is_firms_configured=is_conf,
        supported_sources=SUPPORTED_SOURCES,
        default_source="VIIRS_NOAA20_NRT",
        data_mode="LIVE_CONFIGURED" if is_conf else "DEMO_FALLBACK",
    )
