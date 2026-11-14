import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.harmonization import (
    HarmonizationResponse,
    HarmonizationStats,
    HarmonizedEvent,
    MatchClassification,
)
from app.services.firms_client import firms_client
from app.services.harmonizer import HarmonizationEngine

router = APIRouter(prefix="/api/harmonization", tags=["Harmonization Engine"])

VALID_DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


async def _fetch_and_harmonize(
    source: str = "ALL",
    min_lon: Optional[float] = None,
    min_lat: Optional[float] = None,
    max_lon: Optional[float] = None,
    max_lat: Optional[float] = None,
    day_range: int = 1,
    date: Optional[str] = None,
    min_frp: Optional[float] = None,
    demo: bool = False,
    spatial_threshold_km: float = 2.0,
    temporal_threshold_minutes: float = 120.0,
) -> HarmonizationResponse:
    # 1. Threshold range validation
    if spatial_threshold_km < 0.1 or spatial_threshold_km > 50.0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid spatial_threshold_km '{spatial_threshold_km}'. Must be between 0.1 and 50.0 km.",
        )
    if temporal_threshold_minutes < 1.0 or temporal_threshold_minutes > 1440.0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid temporal_threshold_minutes '{temporal_threshold_minutes}'. Must be between 1.0 and 1440.0 minutes.",
        )

    # 2. Validate bounding box if any coordinate is provided
    bbox: Optional[List[float]] = None
    bbox_coords = [min_lon, min_lat, max_lon, max_lat]
    if any(c is not None for c in bbox_coords):
        if not all(c is not None for c in bbox_coords):
            raise HTTPException(
                status_code=400,
                detail="Incomplete bounding box: min_lon, min_lat, max_lon, and max_lat must all be provided.",
            )
        if min_lat < -90.0 or min_lat > 90.0 or max_lat < -90.0 or max_lat > 90.0:  # type: ignore
            raise HTTPException(status_code=400, detail="Latitude must be between -90.0 and 90.0 degrees.")
        if min_lon < -180.0 or min_lon > 180.0 or max_lon < -180.0 or max_lon > 180.0:  # type: ignore
            raise HTTPException(status_code=400, detail="Longitude must be between -180.0 and 180.0 degrees.")
        if min_lon >= max_lon:  # type: ignore
            raise HTTPException(
                status_code=400,
                detail="Invalid bounding box: min_lon must be less than max_lon. (For antimeridian queries, query +/-180 as two separate boxes).",
            )
        if min_lat >= max_lat:  # type: ignore
            raise HTTPException(status_code=400, detail="Invalid bounding box: min_lat must be less than max_lat.")
        bbox = [min_lon, min_lat, max_lon, max_lat]  # type: ignore

    # 3. Validate date string if provided
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

    # Fetch normalized fire observations buffer
    raw_response = await firms_client.get_observations(
        source=source,
        bbox=bbox,
        day_range=day_range,
        date_str=date,
        min_frp=min_frp,
        force_demo=demo,
    )

    engine = HarmonizationEngine(
        spatial_threshold_km=spatial_threshold_km,
        temporal_threshold_minutes=temporal_threshold_minutes,
    )

    return engine.harmonize(
        observations=raw_response.observations,
        is_live=raw_response.is_live,
        data_source=raw_response.data_source,
    )


@router.get("/events", response_model=HarmonizationResponse)
async def get_harmonized_events(
    source: str = Query(default="ALL"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    day_range: int = Query(default=1, ge=1, le=10),
    date: Optional[str] = Query(default=None),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
    spatial_threshold_km: float = Query(default=2.0, ge=0.1, le=50.0, description="Max spatial distance threshold (km)"),
    temporal_threshold_minutes: float = Query(default=120.0, ge=1.0, le=1440.0, description="Max temporal delta (minutes)"),
    classification: Optional[Literal["MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"]] = Query(
        default=None, description="Optional classification filter"
    ),
    demo: bool = Query(default=False),
) -> HarmonizationResponse:
    """
    Returns unified cross-sensor fire events associating MODIS (1km) and VIIRS (375m) observations.
    Never sums FRP across sensors.
    When filtered by classification, returns updated statistics consistent with the filtered set.
    """
    resp = await _fetch_and_harmonize(
        source=source,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        day_range=day_range,
        date=date,
        min_frp=min_frp,
        demo=demo,
        spatial_threshold_km=spatial_threshold_km,
        temporal_threshold_minutes=temporal_threshold_minutes,
    )

    if classification:
        unfiltered_total = len(resp.events)
        filtered_events = [e for e in resp.events if e.classification == classification]
        resp.events = filtered_events
        engine = HarmonizationEngine(
            spatial_threshold_km=spatial_threshold_km,
            temporal_threshold_minutes=temporal_threshold_minutes,
        )
        resp.stats = engine._compute_stats(filtered_events, unfiltered_total=unfiltered_total)

    return resp


@router.get("/stats", response_model=HarmonizationStats)
async def get_harmonization_stats(
    source: str = Query(default="ALL"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    day_range: int = Query(default=1, ge=1, le=10),
    date: Optional[str] = Query(default=None),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
    spatial_threshold_km: float = Query(default=2.0, ge=0.1, le=50.0),
    temporal_threshold_minutes: float = Query(default=120.0, ge=1.0, le=1440.0),
    classification: Optional[Literal["MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"]] = Query(
        default=None, description="Optional classification filter for statistics"
    ),
    demo: bool = Query(default=False),
) -> HarmonizationStats:
    """
    Returns statistical metrics summarizing cross-sensor matching outcomes.
    Supports classification filtering with consistent semantics to /events.
    """
    resp = await _fetch_and_harmonize(
        source=source,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        day_range=day_range,
        date=date,
        min_frp=min_frp,
        demo=demo,
        spatial_threshold_km=spatial_threshold_km,
        temporal_threshold_minutes=temporal_threshold_minutes,
    )

    if classification:
        unfiltered_total = len(resp.events)
        filtered_events = [e for e in resp.events if e.classification == classification]
        engine = HarmonizationEngine(
            spatial_threshold_km=spatial_threshold_km,
            temporal_threshold_minutes=temporal_threshold_minutes,
        )
        return engine._compute_stats(filtered_events, unfiltered_total=unfiltered_total)

    return resp.stats


@router.get("/observations")
async def get_harmonized_observation_partitions(
    source: str = Query(default="ALL"),
    min_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    max_lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    day_range: int = Query(default=1, ge=1, le=10),
    date: Optional[str] = Query(default=None),
    min_frp: Optional[float] = Query(default=None, ge=0.0),
    spatial_threshold_km: float = Query(default=2.0, ge=0.1, le=50.0),
    temporal_threshold_minutes: float = Query(default=120.0, ge=1.0, le=1440.0),
    classification: Optional[Literal["MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"]] = Query(
        default=None, description="Optional classification filter"
    ),
    demo: bool = Query(default=False),
) -> Dict[str, Any]:
    """
    Returns observations classified into matched and unmatched groupings with consistent classification semantics.
    Includes both unified event groupings and mapped observation IDs.
    """
    resp = await _fetch_and_harmonize(
        source=source,
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        day_range=day_range,
        date=date,
        min_frp=min_frp,
        demo=demo,
        spatial_threshold_km=spatial_threshold_km,
        temporal_threshold_minutes=temporal_threshold_minutes,
    )

    if classification:
        unfiltered_total = len(resp.events)
        filtered_events = [e for e in resp.events if e.classification == classification]
        engine = HarmonizationEngine(
            spatial_threshold_km=spatial_threshold_km,
            temporal_threshold_minutes=temporal_threshold_minutes,
        )
        stats = engine._compute_stats(filtered_events, unfiltered_total=unfiltered_total)
        target_events = filtered_events
    else:
        stats = resp.stats
        target_events = resp.events

    matched_events = [e for e in target_events if e.classification == "MATCHED"]
    modis_only_events = [e for e in target_events if e.classification == "MODIS_ONLY"]
    viirs_only_events = [e for e in target_events if e.classification == "VIIRS_ONLY"]
    ambiguous_events = [e for e in target_events if e.classification == "AMBIGUOUS"]

    return {
        "stats": stats,
        "is_live": resp.is_live,
        "data_source": resp.data_source,
        "fetched_at": resp.fetched_at,
        "classification_filter": classification,
        "matched": matched_events,
        "modis_only": modis_only_events,
        "viirs_only": viirs_only_events,
        "ambiguous": ambiguous_events,
        "observation_partition": {
            "matched_observation_ids": sorted(list({oid for e in matched_events for oid in e.modis_observation_ids + e.viirs_observation_ids})),
            "modis_only_observation_ids": sorted(list({oid for e in modis_only_events for oid in e.modis_observation_ids})),
            "viirs_only_observation_ids": sorted(list({oid for e in viirs_only_events for oid in e.viirs_observation_ids})),
            "ambiguous_observation_ids": sorted(list({oid for e in ambiguous_events for oid in e.modis_observation_ids + e.viirs_observation_ids})),
        },
    }
