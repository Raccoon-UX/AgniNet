import hashlib
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from app.models.fire import NormalizedObservation
from app.models.harmonization import (
    HarmonizationResponse,
    HarmonizationStats,
    HarmonizedEvent,
    MatchClassification,
)


def validate_coordinates(lat: float, lon: float) -> Tuple[float, float]:
    """
    Validates WGS84 coordinate bounds: lat in [-90, 90], lon in [-180, 180].
    Raises ValueError if coordinates fall outside valid bounds.
    """
    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude {lat} out of valid bounds [-90.0, 90.0]")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude {lon} out of valid bounds [-180.0, 180.0]")
    return lat, lon


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates geodesic distance between two points on WGS84 authalic sphere (R = 6371.0088 km).
    Properly handles the antimeridian dateline crossing (longitude wrap-around between -180 and +180)
    and polar/high-latitude convergence.
    """
    validate_coordinates(lat1, lon1)
    validate_coordinates(lat2, lon2)

    r_earth = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)

    # Normalize delta lambda to [-pi, pi] to correctly handle antimeridian dateline crossing
    dlambda = math.radians(lon2 - lon1)
    dlambda = (dlambda + math.pi) % (2.0 * math.pi) - math.pi

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    )
    c = 2.0 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    return r_earth * c


def temporal_diff_minutes(
    date1: str, time1: Optional[str], date2: str, time2: Optional[str]
) -> Optional[float]:
    """
    Calculates absolute temporal delta in minutes between two UTC timestamps.
    Handles midnight/day-boundary transitions seamlessly using calendar dates.
    Returns None if either timestamp is missing, malformed, or unparseable.
    Never infers or fabricates missing acquisition times.
    """
    if not time1 or not time2 or not date1 or not date2:
        return None
    try:
        dt1 = datetime.strptime(f"{date1.strip()} {time1.strip()}", "%Y-%m-%d %H:%M").replace(
            tzinfo=timezone.utc
        )
        dt2 = datetime.strptime(f"{date2.strip()} {time2.strip()}", "%Y-%m-%d %H:%M").replace(
            tzinfo=timezone.utc
        )
        return abs((dt1 - dt2).total_seconds()) / 60.0
    except (ValueError, TypeError):
        return None


def get_effective_footprint_radius_km(obs: NormalizedObservation) -> float:
    """
    Computes effective spatial footprint circumradius in kilometers.
    NASA FIRMS reports 'scan' (along-scan pixel size in km) and 'track' (along-track pixel size in km),
    which are spatial dimensions in kilometers, not angular degrees.
    The semi-diagonal (circumradius) of a scan x track pixel is sqrt(scan^2 + track^2) / 2.
    Nominal nadir fallbacks: MODIS 1.0km x 1.0km (0.707 km radius), VIIRS 0.375km x 0.375km (0.265 km radius).
    """
    if (
        obs.scan_angle is not None
        and obs.track_km is not None
        and obs.scan_angle > 0
        and obs.track_km > 0
    ):
        return math.sqrt(obs.scan_angle**2 + obs.track_km**2) / 2.0
    if obs.instrument == "MODIS":
        return 0.7071
    return 0.2652


def calculate_representative_centroid(observations: List[NormalizedObservation]) -> Tuple[float, float]:
    """
    Computes representative centroid coordinates for a set of observations.
    Uses arithmetic mean for latitude and circular mean for longitude to correctly handle
    dateline/antimeridian crossings (preventing longitude wrap-around from averaging to 0.0).
    """
    if not observations:
        return 0.0, 0.0
    if len(observations) == 1:
        return observations[0].latitude, observations[0].longitude

    mean_lat = sum(o.latitude for o in observations) / len(observations)

    # Circular mean for longitude: sum(cos(lambda)) and sum(sin(lambda))
    sum_x = sum(math.cos(math.radians(o.longitude)) for o in observations)
    sum_y = sum(math.sin(math.radians(o.longitude)) for o in observations)

    if abs(sum_x) < 1e-9 and abs(sum_y) < 1e-9:
        mean_lon = observations[0].longitude
    else:
        mean_lon = math.degrees(math.atan2(sum_y, sum_x))

    return round(mean_lat, 4), round(mean_lon, 4)


def generate_event_id(date: str, lat: float, lon: float, source_ids: List[str]) -> str:
    """
    Generates a deterministic, stable unified event identifier.
    Guarantees invariance across repeated executions and arbitrary input observation orderings
    by sorting unique source record IDs before hashing.
    """
    sorted_unique_ids = sorted(list(set(source_ids)))
    token = f"{date}_{lat:.4f}_{lon:.4f}_" + "_".join(sorted_unique_ids)
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()[:8]
    lat_sign = "N" if lat >= 0 else "S"
    lon_sign = "E" if lon >= 0 else "W"
    return f"AGNI-EVT-{date.replace('-', '')}-{abs(lat):.2f}{lat_sign}_{abs(lon):.2f}{lon_sign}-{digest}"


class HarmonizationEngine:
    ALGORITHM_VERSION = "AgniNet-Harmonize-v1.1"

    def __init__(
        self,
        spatial_threshold_km: float = 2.0,
        temporal_threshold_minutes: float = 120.0,
    ):
        """
        Initializes harmonization engine with configurable thresholds.
        Boundaries: spatial_threshold_km in [0.1, 50.0], temporal_threshold_minutes in [1.0, 1440.0].
        """
        self.spatial_threshold_km = max(0.1, min(50.0, float(spatial_threshold_km)))
        self.temporal_threshold_minutes = max(1.0, min(1440.0, float(temporal_threshold_minutes)))

    def harmonize(
        self,
        observations: List[NormalizedObservation],
        is_live: bool = True,
        data_source: str = "NASA_FIRMS_LIVE",
    ) -> HarmonizationResponse:
        """
        Harmonizes MODIS and VIIRS observations into unified events.
        Enforces:
        1. Coordinate bounds validation and antimeridian wrap-around.
        2. Exact inclusive boundary threshold checks (<= threshold).
        3. Connected-component graph partitioning guaranteeing ZERO duplicate event memberships.
        4. Strict FRP non-summation across sensors, and single-pass VIIRS aggregation policy.
        5. Deterministic event IDs invariant to input ordering.
        6. Explainable heuristic match scoring with separated spatial and temporal components.
        """
        # Separate observations by instrument
        modis_obs: List[NormalizedObservation] = [o for o in observations if o.instrument == "MODIS"]
        viirs_obs: List[NormalizedObservation] = [o for o in observations if o.instrument == "VIIRS"]
        all_obs_by_id: Dict[str, NormalizedObservation] = {o.id: o for o in observations}

        # Spatial grid indexing: 0.5 degree bins (~55 km) for fast spatial candidate search
        grid_cell_size = 0.5
        viirs_grid: Dict[Tuple[int, int], List[NormalizedObservation]] = {}
        for v in viirs_obs:
            try:
                validate_coordinates(v.latitude, v.longitude)
            except ValueError:
                continue
            cell = (int(math.floor(v.latitude / grid_cell_size)), int(math.floor(v.longitude / grid_cell_size)))
            viirs_grid.setdefault(cell, []).append(v)

        # Graph vertices and adjacency: edge represents valid candidate association
        # Edge tuple: (neighbor_id, dist_km, time_diff_min, spatial_score, temporal_score, has_temporal_uncertainty)
        adj: Dict[str, List[Tuple[str, float, Optional[float], float, Optional[float], bool]]] = {
            o.id: [] for o in observations
        }

        # Candidate evaluation between MODIS and VIIRS
        for m in modis_obs:
            try:
                validate_coordinates(m.latitude, m.longitude)
            except ValueError:
                continue

            m_radius = get_effective_footprint_radius_km(m)
            m_cell_lat = int(math.floor(m.latitude / grid_cell_size))
            m_cell_lon = int(math.floor(m.longitude / grid_cell_size))

            # Query 3x3 neighboring grid cells
            candidate_viirs: List[NormalizedObservation] = []
            for d_lat in (-1, 0, 1):
                for d_lon in (-1, 0, 1):
                    neighbor_cell = (m_cell_lat + d_lat, m_cell_lon + d_lon)
                    candidate_viirs.extend(viirs_grid.get(neighbor_cell, []))

            for v in candidate_viirs:
                # 1. Geodesic distance & dynamic footprint threshold check
                dist = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
                effective_spatial = max(
                    self.spatial_threshold_km,
                    m_radius + get_effective_footprint_radius_km(v),
                )
                # Exact inclusive threshold boundary
                if dist > effective_spatial:
                    continue

                # 2. Temporal synchronization check
                t_diff = temporal_diff_minutes(
                    m.acquisition_date,
                    m.acquisition_time_utc,
                    v.acquisition_date,
                    v.acquisition_time_utc,
                )

                has_temporal_uncertainty = False
                if t_diff is None:
                    # Missing acquisition time on either record prevents definitive temporal verification
                    has_temporal_uncertainty = True
                elif t_diff > self.temporal_threshold_minutes:
                    # Beyond temporal synchronization window (exact inclusive boundary)
                    continue

                # 3. Heuristic sub-scores (bounded 0.0 - 1.0)
                # Spatial proximity score: 1.0 at 0km distance, 0.0 at effective_spatial threshold
                score_spatial = max(0.0, min(1.0, 1.0 - (dist / effective_spatial)))
                # Temporal proximity score: 1.0 at simultaneous pass, 0.0 at temporal threshold
                score_temporal = (
                    max(0.0, min(1.0, 1.0 - (t_diff / self.temporal_threshold_minutes)))
                    if t_diff is not None
                    else None
                )

                edge_m = (v.id, dist, t_diff, score_spatial, score_temporal, has_temporal_uncertainty)
                edge_v = (m.id, dist, t_diff, score_spatial, score_temporal, has_temporal_uncertainty)
                adj[m.id].append(edge_m)
                adj[v.id].append(edge_v)

        # Connected Components Graph Partitioning
        # Ensures EVERY observation belongs to EXACTLY ONE unified event (zero duplicate memberships)
        visited: Set[str] = set()
        components: List[List[str]] = []

        # Sort keys to ensure deterministic component traversal
        for obs_id in sorted(all_obs_by_id.keys()):
            if obs_id in visited:
                continue
            component: List[str] = []
            queue = [obs_id]
            visited.add(obs_id)
            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for edge in adj[curr]:
                    neighbor_id = edge[0]
                    if neighbor_id not in visited:
                        visited.add(neighbor_id)
                        queue.append(neighbor_id)
            components.append(component)

        # Build Unified Events from Components
        events: List[HarmonizedEvent] = []

        for comp_ids in components:
            comp_obs = [all_obs_by_id[oid] for oid in comp_ids]
            m_list = [o for o in comp_obs if o.instrument == "MODIS"]
            v_list = [o for o in comp_obs if o.instrument == "VIIRS"]

            # Case 1: MODIS-only isolated event
            if len(m_list) == 1 and len(v_list) == 0:
                m = m_list[0]
                evt = HarmonizedEvent(
                    id=generate_event_id(m.acquisition_date, m.latitude, m.longitude, [m.id]),
                    classification="MODIS_ONLY",
                    latitude=m.latitude,
                    longitude=m.longitude,
                    acquisition_date=m.acquisition_date,
                    earliest_acq_utc=m.acquisition_time_utc,
                    latest_acq_utc=m.acquisition_time_utc,
                    modis_observation_ids=[m.id],
                    viirs_observation_ids=[],
                    modis_satellites=[m.satellite],
                    viirs_satellites=[],
                    modis_frp_mw=m.frp_mw,
                    viirs_total_frp_mw=None,
                    viirs_individual_frps=[],
                    spatial_distance_km=None,
                    temporal_difference_minutes=None,
                    spatial_score=None,
                    temporal_score=None,
                    match_score=0.0,
                    evidence_notes=f"MODIS_ONLY: No qualifying VIIRS observation within {self.spatial_threshold_km}km / {self.temporal_threshold_minutes}min window.",
                    algorithm_version=self.ALGORITHM_VERSION,
                )
                events.append(evt)

            # Case 2: VIIRS-only isolated event
            elif len(m_list) == 0 and len(v_list) == 1:
                v = v_list[0]
                evt = HarmonizedEvent(
                    id=generate_event_id(v.acquisition_date, v.latitude, v.longitude, [v.id]),
                    classification="VIIRS_ONLY",
                    latitude=v.latitude,
                    longitude=v.longitude,
                    acquisition_date=v.acquisition_date,
                    earliest_acq_utc=v.acquisition_time_utc,
                    latest_acq_utc=v.acquisition_time_utc,
                    modis_observation_ids=[],
                    viirs_observation_ids=[v.id],
                    modis_satellites=[],
                    viirs_satellites=[v.satellite],
                    modis_frp_mw=None,
                    viirs_total_frp_mw=v.frp_mw,
                    viirs_individual_frps=[v.frp_mw] if v.frp_mw is not None else [],
                    spatial_distance_km=None,
                    temporal_difference_minutes=None,
                    spatial_score=None,
                    temporal_score=None,
                    match_score=0.0,
                    evidence_notes=f"VIIRS_ONLY: High-resolution hotspot without qualifying MODIS counterpart within {self.spatial_threshold_km}km / {self.temporal_threshold_minutes}min window.",
                    algorithm_version=self.ALGORITHM_VERSION,
                )
                events.append(evt)

            # Case 3: Supported 1-to-N Association (1 MODIS with 1 or more co-located VIIRS sub-pixels)
            elif len(m_list) == 1 and len(v_list) >= 1:
                m = m_list[0]
                edges = [e for e in adj[m.id] if e[0] in [v.id for v in v_list]]
                has_temporal_uncertainty = any(e[5] for e in edges)

                dists = [e[1] for e in edges]
                times = [e[2] for e in edges if e[2] is not None]
                spatial_scores = [e[3] for e in edges]
                temporal_scores = [e[4] for e in edges if e[4] is not None]

                mean_spatial_score = sum(spatial_scores) / len(spatial_scores) if spatial_scores else 0.5
                mean_temporal_score = sum(temporal_scores) / len(temporal_scores) if temporal_scores else None

                rep_lat, rep_lon = calculate_representative_centroid(comp_obs)
                v_times = [v.acquisition_time_utc for v in v_list if v.acquisition_time_utc]
                all_times = sorted([t for t in ([m.acquisition_time_utc] + v_times) if t])

                # FRP processing:
                viirs_frps = [v.frp_mw for v in v_list if v.frp_mw is not None]
                # Single-pass VIIRS aggregation policy:
                # Summing VIIRS FRP is only valid across pixels from the SAME satellite pass.
                # If VIIRS observations come from different satellite platforms, summing is prohibited to prevent double-counting.
                unique_viirs_sats = {v.satellite for v in v_list}
                if len(unique_viirs_sats) == 1 and viirs_frps:
                    viirs_total_frp = round(sum(viirs_frps), 1)
                elif len(unique_viirs_sats) > 1:
                    # Multi-pass VIIRS observations: preserve individual values, set aggregated total to None with note
                    viirs_total_frp = None
                else:
                    viirs_total_frp = None

                if has_temporal_uncertainty:
                    # AMBIGUOUS due to missing acquisition time
                    match_score = round(min(0.40, 0.55 * mean_spatial_score * 0.6), 3)
                    notes = "AMBIGUOUS: Missing acquisition time prevents definitive temporal verification."
                    evt = HarmonizedEvent(
                        id=generate_event_id(m.acquisition_date, rep_lat, rep_lon, comp_ids),
                        classification="AMBIGUOUS",
                        latitude=rep_lat,
                        longitude=rep_lon,
                        acquisition_date=m.acquisition_date,
                        earliest_acq_utc=all_times[0] if all_times else None,
                        latest_acq_utc=all_times[-1] if all_times else None,
                        modis_observation_ids=[m.id],
                        viirs_observation_ids=[v.id for v in v_list],
                        modis_satellites=[m.satellite],
                        viirs_satellites=sorted(list(unique_viirs_sats)),
                        modis_frp_mw=m.frp_mw,
                        viirs_total_frp_mw=viirs_total_frp,
                        viirs_individual_frps=viirs_frps,
                        spatial_distance_km=round(min(dists), 3) if dists else None,
                        temporal_difference_minutes=round(min(times), 1) if times else None,
                        spatial_score=round(mean_spatial_score, 3),
                        temporal_score=None,
                        match_score=match_score,
                        evidence_notes=notes,
                        algorithm_version=self.ALGORITHM_VERSION,
                    )
                else:
                    # Supported MATCHED event
                    # Heuristic match score: 0.55 * spatial + 0.45 * temporal
                    temp_s = mean_temporal_score if mean_temporal_score is not None else 0.5
                    match_score = round(max(0.0, min(1.0, 0.55 * mean_spatial_score + 0.45 * temp_s)), 3)
                    notes = (
                        f"MATCHED: 1 MODIS pixel ({m.satellite}) confirmed by {len(v_list)} sub-pixel VIIRS detection(s)."
                        if len(unique_viirs_sats) <= 1
                        else f"MATCHED: 1 MODIS pixel ({m.satellite}) confirmed by {len(v_list)} VIIRS detection(s) across {len(unique_viirs_sats)} satellite passes (FRP preserved individually)."
                    )
                    evt = HarmonizedEvent(
                        id=generate_event_id(m.acquisition_date, rep_lat, rep_lon, comp_ids),
                        classification="MATCHED",
                        latitude=rep_lat,
                        longitude=rep_lon,
                        acquisition_date=m.acquisition_date,
                        earliest_acq_utc=all_times[0] if all_times else None,
                        latest_acq_utc=all_times[-1] if all_times else None,
                        modis_observation_ids=[m.id],
                        viirs_observation_ids=[v.id for v in v_list],
                        modis_satellites=[m.satellite],
                        viirs_satellites=sorted(list(unique_viirs_sats)),
                        modis_frp_mw=m.frp_mw,
                        viirs_total_frp_mw=viirs_total_frp,
                        viirs_individual_frps=viirs_frps,
                        spatial_distance_km=round(min(dists), 3) if dists else None,
                        temporal_difference_minutes=round(min(times), 1) if times else None,
                        spatial_score=round(mean_spatial_score, 3),
                        temporal_score=round(mean_temporal_score, 3) if mean_temporal_score is not None else None,
                        match_score=match_score,
                        evidence_notes=notes,
                        algorithm_version=self.ALGORITHM_VERSION,
                    )
                events.append(evt)

            # Case 4: Multiple MODIS or chained candidate cluster (contested associations)
            else:
                rep_lat, rep_lon = calculate_representative_centroid(comp_obs)
                all_times = sorted([o.acquisition_time_utc for o in comp_obs if o.acquisition_time_utc])
                modis_frps = [m.frp_mw for m in m_list if m.frp_mw is not None]
                viirs_frps = [v.frp_mw for v in v_list if v.frp_mw is not None]

                # Collect all component edge metrics
                comp_dists = []
                comp_times = []
                comp_spatial_scores = []
                comp_temporal_scores = []
                for oid in comp_ids:
                    for edge in adj[oid]:
                        if edge[0] in comp_ids:
                            comp_dists.append(edge[1])
                            if edge[2] is not None:
                                comp_times.append(edge[2])
                            comp_spatial_scores.append(edge[3])
                            if edge[4] is not None:
                                comp_temporal_scores.append(edge[4])

                mean_spatial_score = sum(comp_spatial_scores) / len(comp_spatial_scores) if comp_spatial_scores else 0.5
                mean_temp_score = sum(comp_temporal_scores) / len(comp_temporal_scores) if comp_temporal_scores else None

                # Ambiguity penalty applied to heuristic match score (capped <= 0.45)
                ambiguity_score = round(min(0.45, 0.45 * mean_spatial_score), 3)

                notes = (
                    f"AMBIGUOUS: Multi-sensor candidate association contested across overlapping footprints "
                    f"({len(m_list)} MODIS, {len(v_list)} VIIRS). Chained/competing relationships prevent unambiguous 1-to-N matching."
                )

                evt = HarmonizedEvent(
                    id=generate_event_id(comp_obs[0].acquisition_date, rep_lat, rep_lon, comp_ids),
                    classification="AMBIGUOUS",
                    latitude=rep_lat,
                    longitude=rep_lon,
                    acquisition_date=comp_obs[0].acquisition_date,
                    earliest_acq_utc=all_times[0] if all_times else None,
                    latest_acq_utc=all_times[-1] if all_times else None,
                    modis_observation_ids=[m.id for m in m_list],
                    viirs_observation_ids=[v.id for v in v_list],
                    modis_satellites=sorted(list({m.satellite for m in m_list})),
                    viirs_satellites=sorted(list({v.satellite for v in v_list})),
                    modis_frp_mw=round(sum(modis_frps) / len(modis_frps), 1) if modis_frps else None,
                    viirs_total_frp_mw=round(sum(viirs_frps), 1) if viirs_frps and len({v.satellite for v in v_list}) == 1 else None,
                    viirs_individual_frps=viirs_frps,
                    spatial_distance_km=round(min(comp_dists), 3) if comp_dists else None,
                    temporal_difference_minutes=round(min(comp_times), 1) if comp_times else None,
                    spatial_score=round(mean_spatial_score, 3),
                    temporal_score=round(mean_temp_score, 3) if mean_temp_score is not None else None,
                    match_score=ambiguity_score,
                    evidence_notes=notes,
                    algorithm_version=self.ALGORITHM_VERSION,
                )
                events.append(evt)

        # Sort events deterministically by id
        events.sort(key=lambda e: e.id)

        # Compute summary statistics
        stats = self._compute_stats(events)

        return HarmonizationResponse(
            events=events,
            stats=stats,
            is_live=is_live,
            data_source="NASA_FIRMS_LIVE" if is_live else "DEMO_FIXTURES",
            fetched_at=datetime.now(timezone.utc).isoformat(),
            algorithm_version=self.ALGORITHM_VERSION,
            applied_thresholds={
                "spatial_threshold_km": self.spatial_threshold_km,
                "temporal_threshold_minutes": self.temporal_threshold_minutes,
            },
        )

    def _compute_stats(
        self,
        events: List[HarmonizedEvent],
        unfiltered_total: Optional[int] = None,
    ) -> HarmonizationStats:
        """Computes statistical metrics over an event collection."""
        matched_c = sum(1 for e in events if e.classification == "MATCHED")
        modis_only_c = sum(1 for e in events if e.classification == "MODIS_ONLY")
        viirs_only_c = sum(1 for e in events if e.classification == "VIIRS_ONLY")
        ambiguous_c = sum(1 for e in events if e.classification == "AMBIGUOUS")

        matched_events = [e for e in events if e.classification == "MATCHED"]
        matched_distances = [e.spatial_distance_km for e in matched_events if e.spatial_distance_km is not None]
        matched_times = [e.temporal_difference_minutes for e in matched_events if e.temporal_difference_minutes is not None]
        matched_scores = [e.match_score for e in matched_events]

        return HarmonizationStats(
            total_events=len(events),
            matched_events=matched_c,
            modis_only_count=modis_only_c,
            viirs_only_count=viirs_only_c,
            ambiguous_count=ambiguous_c,
            spatial_threshold_km=self.spatial_threshold_km,
            temporal_threshold_minutes=self.temporal_threshold_minutes,
            mean_spatial_distance_km=round(sum(matched_distances) / len(matched_distances), 2) if matched_distances else None,
            mean_temporal_difference_minutes=round(sum(matched_times) / len(matched_times), 1) if matched_times else None,
            average_match_score=round(sum(matched_scores) / len(matched_scores), 3) if matched_scores else None,
            unfiltered_total_events=unfiltered_total if unfiltered_total is not None else len(events),
        )
