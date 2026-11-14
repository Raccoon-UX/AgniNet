import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.fire import FireObservationsResponse, ObservationKpis
from app.services.firms_client import firms_client

router = APIRouter(prefix="/api/fires", tags=["Fire Observations"])

VALID_DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.get("", response_model=FireObservationsResponse)
async def get_fire_observations(
    source: str = Query(
        default="ALL",
        description="Filter by sensor source: ALL, MODIS, VIIRS, MODIS_NRT, VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT, VIIRS_SNPP_NRT",
    ),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0, description="Bounding box western longitude"),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0, description="Bounding box southern latitude"),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0, description="Bounding box eastern longitude"),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0, description="Bounding box northern latitude"),
    day_range: int = Query(default=1, ge=1, le=10, description="Day range window (1-10 days)"),
    date: Optional[str] = Query(default=None, description="Target acquisition date in YYYY-MM-DD format"),
    min_frp: Optional[float] = Query(default=None, ge=0.0, description="Minimum Fire Radiative Power (MW) threshold"),
    demo: bool = Query(default=False, description="Force demo fixtures mode"),
) -> FireObservationsResponse:
    """
    Retrieves normalized active fire observations from NASA FIRMS API (or DEMO fallback).
    Never exposes internal MAP_KEY to callers.
    """
    # Validate bounding box if any coordinate is provided
    bbox: Optional[List[float]] = None
    bbox_coords = [min_lon, min_lat, max_lon, max_lat]
    if any(c is not None for c in bbox_coords):
        if not all(c is not None for c in bbox_coords):
            raise HTTPException(
                status_code=400,
                detail="Incomplete bounding box: min_lon, min_lat, max_lon, and max_lat must all be provided.",
            )
        if min_lon >= max_lon:  # type: ignore
            raise HTTPException(status_code=400, detail="Invalid bounding box: min_lon must be less than max_lon.")
        if min_lat >= max_lat:  # type: ignore
            raise HTTPException(status_code=400, detail="Invalid bounding box: min_lat must be less than max_lat.")
        bbox = [min_lon, min_lat, max_lon, max_lat]  # type: ignore

    # Validate date string if provided
    if date:
        if not VALID_DATE_REGEX.match(date):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format '{date}'. Expected YYYY-MM-DD.",
            )
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid calendar date '{date}'.")

    return await firms_client.get_observations(
        source=source,
        bbox=bbox,
        day_range=day_range,
        date_str=date,
        min_frp=min_frp,
        force_demo=demo,
    )


@router.get("/kpis", response_model=ObservationKpis)
async def get_fire_kpis(
    source: str = Query(default="ALL"),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
    demo: bool = Query(default=False),
) -> ObservationKpis:
    """Returns aggregated KPI metrics over current observation buffer."""
    resp = await firms_client.get_observations(
        source=source,
        min_frp=min_frp,
        force_demo=demo,
    )
    return resp.kpis
