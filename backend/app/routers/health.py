from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.models.health import HealthResponse
from app.services.firms_client import firms_client

router = APIRouter(prefix="/api/health", tags=["System Health"])


@router.get("", response_model=HealthResponse)
async def check_health() -> HealthResponse:
    is_configured = settings.is_firms_configured
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        nasa_firms_configured=is_configured,
        data_mode="LIVE_CONFIGURED" if is_configured else "DEMO_FALLBACK",
        cache_entries=firms_client.get_cache_size(),
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        upstream_firms_endpoint=settings.firms_base_url,
        message=(
            "NASA FIRMS API Key is active. Live MODIS/VIIRS queries enabled."
            if is_configured
            else "NASA FIRMS API Key absent. Running in high-fidelity DEMO mode."
        ),
    )
