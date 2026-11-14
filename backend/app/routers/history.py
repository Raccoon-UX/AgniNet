import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple
from fastapi import APIRouter, HTTPException, Query
from app.models.fire import NormalizedObservation
from app.models.harmonization import MatchClassification
from app.models.history import (
    HistoricalCalendarResponse,
    HistoricalEventsResponse,
    HistoricalIngestionRequest,
    HistoricalIngestionResponse,
    HistoricalRegionsResponse,
    HistoricalSensorsResponse,
    HistoricalSummary,
    HistoricalTrendsResponse,
)
from app.services.historical_service import historical_service

router = APIRouter(prefix="/api/history", tags=["Historical Intelligence"])

VALID_DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_date_string(date_str: Optional[str], field_name: str) -> Optional[str]:
    """Validates date format as YYYY-MM-DD and checks calendar validity."""
    if not date_str:
        return None
    clean = date_str.strip()
    if not VALID_DATE_REGEX.match(clean):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format '{clean}'. Expected YYYY-MM-DD.",
        )
    try:
        datetime.strptime(clean, "%Y-%m-%d")
        return clean
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid calendar date '{clean}' for {field_name}.")


def _validate_date_range(start_date: Optional[str], end_date: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Validates and cross-checks start_date and end_date."""
    valid_start = _validate_date_string(start_date, "start_date")
    valid_end = _validate_date_string(end_date, "end_date")
    if valid_start and valid_end and valid_start > valid_end:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date range: start_date '{valid_start}' cannot be after end_date '{valid_end}'.",
        )
    return valid_start, valid_end


def _validate_bbox(
    min_lon: Optional[float],
    min_lat: Optional[float],
    max_lon: Optional[float],
    max_lat: Optional[float],
) -> None:
    """Validates bounding box coordinates and ranges."""
    coords = [min_lon, min_lat, max_lon, max_lat]
    if any(c is not None for c in coords):
        if not all(c is not None for c in coords):
            raise HTTPException(
                status_code=400,
                detail="Incomplete bounding box: min_lon, min_lat, max_lon, and max_lat must all be provided.",
            )
        if min_lat < -90.0 or min_lat > 90.0 or max_lat < -90.0 or max_lat > 90.0:  # type: ignore
            raise HTTPException(status_code=400, detail="Latitude must be between -90.0 and 90.0 degrees.")
        if min_lon < -180.0 or min_lon > 180.0 or max_lon < -180.0 or max_lon > 180.0:  # type: ignore
            raise HTTPException(status_code=400, detail="Longitude must be between -180.0 and 180.0 degrees.")
        if min_lon >= max_lon:  # type: ignore
            raise HTTPException(status_code=400, detail="Invalid bounding box: min_lon must be less than max_lon.")
        if min_lat >= max_lat:  # type: ignore
            raise HTTPException(status_code=400, detail="Invalid bounding box: min_lat must be less than max_lat.")


@router.get("/summary", response_model=HistoricalSummary)
async def get_historical_summary(
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    instrument: Optional[Literal["MODIS", "VIIRS"]] = Query(default=None),
    satellite: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
) -> HistoricalSummary:
    """Returns high-level statistical roll-up KPIs for historical fire archives."""
    v_start, v_end = _validate_date_range(start_date, end_date)
    _validate_bbox(min_lon, min_lat, max_lon, max_lat)

    return historical_service.get_summary(
        start_date=v_start,
        end_date=v_end,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        instrument=instrument,
        satellite=satellite,
        region=region,
        min_frp=min_frp,
    )


@router.get("/trends", response_model=HistoricalTrendsResponse)
async def get_historical_trends(
    granularity: Literal["day", "week", "month"] = Query(default="day", description="Temporal aggregation bucket"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    instrument: Optional[Literal["MODIS", "VIIRS"]] = Query(default=None),
    satellite: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
) -> HistoricalTrendsResponse:
    """Returns time-series activity trends grouped by day, week, or month with strict FRP sensor separation."""
    v_start, v_end = _validate_date_range(start_date, end_date)
    _validate_bbox(min_lon, min_lat, max_lon, max_lat)

    return historical_service.get_trends(
        granularity=granularity,
        start_date=v_start,
        end_date=v_end,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        instrument=instrument,
        satellite=satellite,
        region=region,
        min_frp=min_frp,
    )


@router.get("/calendar", response_model=HistoricalCalendarResponse)
async def get_historical_calendar(
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    instrument: Optional[Literal["MODIS", "VIIRS"]] = Query(default=None),
    satellite: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
) -> HistoricalCalendarResponse:
    """Returns daily fire activity matrix with normalized thermal intensity indices."""
    v_start, v_end = _validate_date_range(start_date, end_date)
    _validate_bbox(min_lon, min_lat, max_lon, max_lat)

    return historical_service.get_calendar(
        start_date=v_start,
        end_date=v_end,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        instrument=instrument,
        satellite=satellite,
        region=region,
        min_frp=min_frp,
    )


@router.get("/regions", response_model=HistoricalRegionsResponse)
async def get_historical_regions(
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
) -> HistoricalRegionsResponse:
    """Returns regional hotspot comparisons and biome breakdown."""
    v_start, v_end = _validate_date_range(start_date, end_date)

    return historical_service.get_regions(
        start_date=v_start,
        end_date=v_end,
        min_frp=min_frp,
    )


@router.get("/sensors", response_model=HistoricalSensorsResponse)
async def get_historical_sensors(
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
) -> HistoricalSensorsResponse:
    """Returns sensor architecture and spacecraft platform comparison metrics."""
    v_start, v_end = _validate_date_range(start_date, end_date)

    return historical_service.get_sensors(
        start_date=v_start,
        end_date=v_end,
        min_frp=min_frp,
    )


@router.get("/events", response_model=HistoricalEventsResponse)
async def get_historical_events(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=25, ge=1, le=200, description="Records per page"),
    classification: Optional[Literal["MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"]] = Query(
        default=None, description="Classification filter"
    ),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
) -> HistoricalEventsResponse:
    """Returns paginated historical unified fire events."""
    v_start, v_end = _validate_date_range(start_date, end_date)
    _validate_bbox(min_lon, min_lat, max_lon, max_lat)

    return historical_service.get_events(
        page=page,
        page_size=page_size,
        classification=classification,
        start_date=v_start,
        end_date=v_end,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        min_frp=min_frp,
    )


@router.post("/ingest", response_model=HistoricalIngestionResponse)
async def ingest_historical_records(
    payload: HistoricalIngestionRequest,
) -> HistoricalIngestionResponse:
    """
    Ingests validated normalized fire observations into the historical archive.
    Deduplicates idempotently on observation.id.
    """
    if not payload.observations:
        raise HTTPException(status_code=400, detail="Observation payload cannot be empty.")

    valid_obs: List[NormalizedObservation] = []
    for idx, raw in enumerate(payload.observations):
        try:
            obs = NormalizedObservation(**raw)
            valid_obs.append(obs)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Record at index {idx} failed validation: {str(e)}",
            )

    return historical_service.ingest_observations(
        observations=valid_obs,
        provenance=payload.provenance or "MANUAL_INGESTION",
    )
