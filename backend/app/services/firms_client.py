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


class FirmsApiException(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class FirmsClient:
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
                logger.info(f"Returning cached FIRMS feed for {cache_key} ({len(cached_obs)} records)")
                return cached_obs

        # Build URL without logging secret key
        # NASA FIRMS Area endpoint: /api/area/csv/[MAP_KEY]/[SOURCE]/[EXTENT]/[DAY_RANGE]/[DATE]
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
                raise FirmsApiException("Upstream NASA FIRMS API request timed out (15s limit).", status_code=504)
            except httpx.RequestError as exc:
                raise FirmsApiException(f"Network error communicating with NASA FIRMS API: {str(exc)}", status_code=502)

        if response.status_code == 403 or "Invalid MAP_KEY" in response.text:
            raise FirmsApiException("NASA FIRMS authentication rejected: Provided MAP_KEY is invalid or unauthorized.", status_code=403)
        if response.status_code == 429:
            raise FirmsApiException("NASA FIRMS API rate limit reached. Please throttle queries or increase cache TTL.", status_code=429)
        if response.status_code != 200:
            raise FirmsApiException(f"NASA FIRMS API returned upstream HTTP {response.status_code}: {response.text[:200]}", status_code=502)

        # Parse CSV
        csv_text = response.text
        # Note: If no fires exist in extent, FIRMS returns header only or blank
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
        """
        # Fallback to demo mode if key not present or forced
        if not settings.is_firms_configured or force_demo:
            return get_demo_observations(source_filter=source, min_frp=min_frp, bbox=bbox)

        # Default bounding box if not supplied (e.g. Western US & California active fire zone)
        # Note: FIRMS free tier area limit requires specific regional bounding box
        target_bbox = bbox or [-125.0, 32.0, -114.0, 42.5]

        # Determine which sources to query
        sources_to_query: List[str] = []
        if source == "ALL":
            sources_to_query = ["VIIRS_NOAA20_NRT", "MODIS_NRT"]
        elif source == "MODIS":
            sources_to_query = ["MODIS_NRT"]
        elif source == "VIIRS":
            sources_to_query = ["VIIRS_NOAA20_NRT", "VIIRS_SNPP_NRT"]
        else:
            sources_to_query = [source]

        all_observations: List[NormalizedObservation] = []
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
            except FirmsApiException as exc:
                logger.warning(f"Error fetching {src}: {str(exc)}")
                upstream_errors.append(f"{src}: {str(exc)}")

        # If all live queries failed, fallback cleanly with informative notice
        if upstream_errors and len(all_observations) == 0:
            demo_resp = get_demo_observations(source_filter=source, min_frp=min_frp, bbox=bbox)
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

        return FireObservationsResponse(
            is_live=True,
            data_source="NASA_FIRMS_LIVE",
            fetched_at=datetime.now(timezone.utc).isoformat(),
            total_count=len(deduped),
            observations=deduped[:settings.max_records_per_response],
            kpis=kpis,
            attribution="NASA FIRMS (LANCE/EOSDIS) Near Real-Time Active Fire Data",
            bounding_box=target_bbox,
            applied_source=source,
            notice="LIVE STREAM: Real NASA FIRMS MODIS/VIIRS satellite observations." if not upstream_errors else f"Partial feed loaded. Warnings: {'; '.join(upstream_errors)}",
        )


firms_client = FirmsClient()
