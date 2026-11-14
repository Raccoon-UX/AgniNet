import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import httpx

from app.config import settings
from app.models.fire import FireObservationsResponse, NormalizedObservation
from app.services.parser import parse_firms_csv, compute_kpis
from app.services.demo_service import get_demo_observations

logger = logging.getLogger("firms_client")

# Simple in-memory cache: key -> (timestamp, response_data)
_CACHE: Dict[str, Tuple[float, List[NormalizedObservation]]] = {}


def _sanitize_error(msg: str) -> str:
    """Strips any sensitive credentials from error messages and logs."""
    str_msg = str(msg)
    if settings.nasa_firms_map_key:
        clean_key = settings.nasa_firms_map_key.strip()
        if clean_key:
            return str_msg.replace(clean_key, "***MAP_KEY***")
    return str_msg


class FirmsApiException(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(_sanitize_error(message))
        self.status_code = status_code


class FirmsClient:
    SOURCE_MAP = {
        "ALL": [
            "VIIRS_NOAA20_NRT",
            "VIIRS_NOAA21_NRT",
            "VIIRS_SNPP_NRT",
            "MODIS_NRT",
        ],
        "VIIRS": [
            "VIIRS_NOAA20_NRT",
            "VIIRS_NOAA21_NRT",
            "VIIRS_SNPP_NRT",
        ],
        "MODIS": ["MODIS_NRT"],
    }

    def __init__(self):
        self.base_url = settings.firms_base_url.rstrip("/")
        self.timeout = settings.request_timeout_seconds
        self.cache_ttl = settings.cache_ttl_seconds

    def _get_cache_key(self, source: str, extent: str, day_range: int, date_str: Optional[str]) -> str:
        d = date_str or "latest"
        return f"{source}:{extent}:{day_range}:{d}"

    def get_cache_size(self) -> int:
        now = time.time()
        # Clean expired
        expired = [k for k, (ts, _) in _CACHE.items() if now - ts > self.cache_ttl]
        for k in expired:
            _CACHE.pop(k, None)
        return len(_CACHE)

    async def fetch_area_feed(
        self,
        source: str,
        bbox: List[float],
        day_range: int = 1,
        date_str: Optional[str] = None,
    ) -> List[NormalizedObservation]:
        """
        Fetches CSV from NASA FIRMS Area API:
        https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[EXTENT]/[DAY_RANGE]/[DATE]
        [EXTENT] format is min_lon,min_lat,max_lon,max_lat
        """
        if not settings.is_firms_configured:
            raise FirmsApiException("NASA_FIRMS_MAP_KEY is not configured.", status_code=503)

        min_lon, min_lat, max_lon, max_lat = bbox
        extent_str = f"{min_lon:.4f},{min_lat:.4f},{max_lon:.4f},{max_lat:.4f}"
        cache_key = self._get_cache_key(source, extent_str, day_range, date_str)

        now = time.time()
        if cache_key in _CACHE:
            cached_time, cached_obs = _CACHE[cache_key]
            if now - cached_time < self.cache_ttl:
                logger.info(f"Returning cached FIRMS feed for {source} in {extent_str} ({len(cached_obs)} records)")
                return cached_obs

        # Build URL without logging secret key
        map_key = settings.nasa_firms_map_key.strip()  # type: ignore
        url_parts = [self.base_url, "area", "csv", map_key, source, extent_str, str(day_range)]
        if date_str:
            url_parts.append(date_str)
        url = "/".join(url_parts)

        logger.info(f"Querying NASA FIRMS Area API for source={source}, extent={extent_str}, day_range={day_range}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
            except httpx.TimeoutException:
                raise FirmsApiException(f"NASA FIRMS API request for {source} timed out ({self.timeout}s limit).", status_code=504)
            except httpx.RequestError as exc:
                sanitized_exc = _sanitize_error(str(exc))
                raise FirmsApiException(f"Network error communicating with NASA FIRMS API: {sanitized_exc}", status_code=502)

        if response.status_code == 403 or "Invalid MAP_KEY" in response.text:
            raise FirmsApiException("NASA FIRMS authentication rejected: MAP_KEY is invalid or unauthorized.", status_code=403)
        if response.status_code == 429:
            raise FirmsApiException("NASA FIRMS API rate limit reached. Please throttle queries or increase cache TTL.", status_code=429)
        if response.status_code != 200:
            preview = _sanitize_error(response.text[:120])
            raise FirmsApiException(f"NASA FIRMS API returned HTTP {response.status_code}: {preview}", status_code=502)

        csv_text = response.text
        # Content verification: check if response is HTML or error text
        stripped = csv_text.strip()
        if stripped.startswith("<!DOCTYPE") or stripped.startswith("<html") or "Invalid API call" in stripped:
            raise FirmsApiException(f"NASA FIRMS returned non-CSV response: {_sanitize_error(stripped[:100])}", status_code=502)

        observations = parse_firms_csv(csv_text, source)
        _CACHE[cache_key] = (now, observations)
        return observations

    async def get_observations(
        self,
        source: str = "ALL",
        bbox: Optional[List[float]] = None,
        day_range: int = 1,
        date_str: Optional[str] = None,
        min_frp: Optional[float] = None,
        force_demo: bool = False,
    ) -> FireObservationsResponse:
        """
        Retrieves normalized observations. If MAP_KEY is absent or force_demo is True,
        safely falls back to labeled demo fixtures.
        Accurately reports multi-feed coverage, partial failures, and degraded states.
        """
        # Fallback to demo mode if key not present or forced
        if not settings.is_firms_configured or force_demo:
            return get_demo_observations(source_filter=source, min_frp=min_frp, bbox=bbox)

        # Default bounding box if not supplied (Northern Australia active fire belt)
        target_bbox = bbox or [120.0, -25.0, 145.0, -12.0]

        # Determine which feeds to query
        src_upper = source.upper()
        if src_upper in self.SOURCE_MAP:
            sources_to_query = list(self.SOURCE_MAP[src_upper])
        else:
            sources_to_query = [source]

        all_observations: List[NormalizedObservation] = []
        succeeded_sources: List[str] = []
        failed_sources: List[str] = []
        upstream_errors: List[str] = []

        for src in sources_to_query:
            try:
                obs = await self.fetch_area_feed(
                    source=src,
                    bbox=target_bbox,
                    day_range=day_range,
                    date_str=date_str,
                )
                all_observations.extend(obs)
                succeeded_sources.append(src)
            except FirmsApiException as exc:
                err_text = _sanitize_error(str(exc))
                logger.warning(f"Feed error for {src}: {err_text}")
                failed_sources.append(src)
                upstream_errors.append(f"{src}: {err_text}")

        # If ALL requested live queries failed, fallback cleanly with informative notice
        if len(succeeded_sources) == 0:
            demo_resp = get_demo_observations(source_filter=source, min_frp=min_frp, bbox=bbox)
            demo_resp.status = "demo_fallback"
            demo_resp.is_partial = False
            demo_resp.succeeded_sources = []
            demo_resp.failed_sources = failed_sources
            demo_resp.notice = f"LIVE API FAILED ({'; '.join(upstream_errors)}). Showing synthetic fallback."
            return demo_resp

        # Apply min FRP filter if specified
        if min_frp is not None:
            all_observations = [o for o in all_observations if (o.frp_mw or 0) >= min_frp]

        # Deduplicate across merged feeds
        seen = set()
        deduped: List[NormalizedObservation] = []
        for o in all_observations:
            if o.id not in seen:
                seen.add(o.id)
                deduped.append(o)

        kpis = compute_kpis(deduped)

        is_partial = len(failed_sources) > 0
        feed_status = "degraded" if is_partial else "healthy"

        if is_partial:
            notice = f"PARTIAL SENSOR FEED: Succeeded [{', '.join(succeeded_sources)}]; Failed [{', '.join(failed_sources)}]."
        else:
            notice = f"LIVE STREAM: All requested sensors operational [{', '.join(succeeded_sources)}]."

        return FireObservationsResponse(
            is_live=True,
            data_source="NASA_FIRMS_LIVE",
            status=feed_status,
            is_partial=is_partial,
            succeeded_sources=succeeded_sources,
            failed_sources=failed_sources,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            total_count=len(deduped),
            observations=deduped[:settings.max_records_per_response],
            kpis=kpis,
            attribution="NASA FIRMS (LANCE/EOSDIS) Near Real-Time Active Fire Data",
            bounding_box=target_bbox,
            applied_source=source,
            notice=notice,
        )


firms_client = FirmsClient()
