import hashlib
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
from app.models.fire import NormalizedObservation
from app.models.harmonization import HarmonizedEvent, HarmonizationStats, HarmonizationResponse


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points on WGS84 sphere using Haversine formula."""
    r_earth = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    )
    c = 2.0 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    return r_earth * c


def temporal_diff_minutes(
    date1: str, time1: Optional[str], date2: str, time2: Optional[str]
) -> Optional[float]:
    """Calculates absolute temporal delta in minutes. Returns None if either timestamp is missing."""
    if not time1 or not time2:
        return None
    try:
        dt1 = datetime.strptime(f"{date1} {time1}", "%Y-%m-%d %H:%M")
        dt2 = datetime.strptime(f"{date2} {time2}", "%Y-%m-%d %H:%M")
        return abs((dt1 - dt2).total_seconds()) / 60.0
    except (ValueError, TypeError):
        return None


def get_effective_footprint_radius_km(obs: NormalizedObservation) -> float:
    """
    Computes effective spatial footprint radius in km.
    Accounts for along-scan and along-track pixel expansion at wide scan angles.
    """
    if (
        obs.scan_angle is not None
        and obs.track_km is not None
        and obs.scan_angle > 0
        and obs.track_km > 0
    ):
        return math.sqrt(obs.scan_angle**2 + obs.track_km**2) / 2.0
    # Nominal nadir footprint radius fallback: MODIS 1000m (0.71km radius), VIIRS 375m (0.27km radius)
    if obs.instrument == "MODIS":
        return 0.707
    return 0.265


def generate_event_id(date: str, lat: float, lon: float, source_ids: List[str]) -> str:
    """Generates a stable, deterministic unified event identifier."""
    token = f"{date}_{lat:.4f}_{lon:.4f}_" + "_".join(sorted(source_ids))
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()[:8]
    return f"AGNI-EVT-{date.replace('-', '')}-{abs(lat):.2f}{'N' if lat >= 0 else 'S'}_{abs(lon):.2f}{'E' if lon >= 0 else 'W'}-{digest}"


class HarmonizationEngine:
    ALGORITHM_VERSION = "AgniNet-Harmonize-v1.0"

    def __init__(
        self,
        spatial_threshold_km: float = 2.0,
        temporal_threshold_minutes: float = 120.0,
    ):
        self.spatial_threshold_km = max(0.2, min(50.0, spatial_threshold_km))
        self.temporal_threshold_minutes = max(1.0, min(1440.0, temporal_threshold_minutes))

    def harmonize(
        self,
        observations: List[NormalizedObservation],
        is_live: bool = True,
        data_source: str = "NASA_FIRMS_LIVE",
    ) -> HarmonizationResponse:
        """
        Associates MODIS (1km) and VIIRS (375m) observations into unified events.
        Enforces spatial footprint awareness, temporal window limits, and unambiguous cluster assignment.
        Never sums FRP across sensors.
        """
        # Separate observations by instrument
        modis_obs: List[NormalizedObservation] = [o for o in observations if o.instrument == "MODIS"]
        viirs_obs: List[NormalizedObservation] = [o for o in observations if o.instrument == "VIIRS"]

        # Track candidate matches: modis_id -> list of candidate tuples
        # Candidate tuple: (viirs_obs, dist_km, time_diff_min, score, has_temporal_uncertainty)
        modis_candidates: Dict[str, List[Tuple[NormalizedObservation, float, Optional[float], float, bool]]] = {
            m.id: [] for m in modis_obs
        }
        # viirs_id -> list of matching modis_ids
        viirs_matched_by: Dict[str, List[str]] = {v.id: [] for v in viirs_obs}

        for m in modis_obs:
            m_radius = get_effective_footprint_radius_km(m)
            for v in viirs_obs:
                # 1. Geographic distance
                dist = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
                effective_spatial = max(
                    self.spatial_threshold_km,
                    m_radius + get_effective_footprint_radius_km(v),
                )
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
                    # Missing acquisition time on either record prevents definitive verification
                    has_temporal_uncertainty = True
                elif t_diff > self.temporal_threshold_minutes:
                    # Beyond synchronization window
                    continue

                # 3. Match score calculation (0.0 - 1.0)
                score_spatial = max(0.0, 1.0 - (dist / effective_spatial))
                score_temporal = (
                    max(0.0, 1.0 - (t_diff / self.temporal_threshold_minutes))
                    if t_diff is not None
                    else 0.5
                )
                match_score = round(0.55 * score_spatial + 0.45 * score_temporal, 3)

                cand = (v, dist, t_diff, match_score, has_temporal_uncertainty)
                modis_candidates[m.id].append(cand)
                viirs_matched_by[v.id].append(m.id)

        # Build Unified Events
        events: List[HarmonizedEvent] = []
        assigned_modis_ids: Set[str] = set()
        assigned_viirs_ids: Set[str] = set()

        # Step A: Evaluate candidate pairings
        for m in modis_obs:
            candidates = modis_candidates.get(m.id, [])
            if not candidates:
                continue

            # Check if any candidate VIIRS observation is contested by multiple disparate MODIS pixels
            contested_viirs = [c[0].id for c in candidates if len(viirs_matched_by[c[0].id]) > 1]
            has_uncertainty = any(c[4] for c in candidates)

            if contested_viirs or has_uncertainty:
                # Ambiguous association: multiple candidate claims or temporal uncertainty
                associated_viirs = [c[0] for c in candidates]
                viirs_frps = [v.frp_mw for v in associated_viirs if v.frp_mw is not None]
                dists = [c[1] for c in candidates]
                times = [c[2] for c in candidates if c[2] is not None]
                scores = [c[3] for c in candidates]

                notes = (
                    "AMBIGUOUS: Multi-sensor candidate association contested across overlapping footprints."
                    if contested_viirs
                    else "AMBIGUOUS: Missing acquisition time prevents definitive temporal verification."
                )

                evt = HarmonizedEvent(
                    id=generate_event_id(m.acquisition_date, m.latitude, m.longitude, [m.id] + [v.id for v in associated_viirs]),
                    classification="AMBIGUOUS",
                    latitude=m.latitude,
                    longitude=m.longitude,
                    acquisition_date=m.acquisition_date,
                    earliest_acq_utc=m.acquisition_time_utc,
                    latest_acq_utc=max([v.acquisition_time_utc for v in associated_viirs if v.acquisition_time_utc] or [m.acquisition_time_utc]),
                    modis_observation_ids=[m.id],
                    viirs_observation_ids=[v.id for v in associated_viirs],
                    modis_satellites=[m.satellite],
                    viirs_satellites=list({v.satellite for v in associated_viirs}),
                    modis_frp_mw=m.frp_mw,
                    viirs_total_frp_mw=round(sum(viirs_frps), 1) if viirs_frps else None,
                    viirs_individual_frps=viirs_frps,
                    spatial_distance_km=round(min(dists), 3) if dists else None,
                    temporal_difference_minutes=round(min(times), 1) if times else None,
                    match_score=max(scores) if scores else 0.5,
                    evidence_notes=notes,
                    algorithm_version=self.ALGORITHM_VERSION,
                )
                events.append(evt)
                assigned_modis_ids.add(m.id)
                for v in associated_viirs:
                    assigned_viirs_ids.add(v.id)

            else:
                # Supported unambiguous association (1 MODIS to 1 or more co-located sub-pixel VIIRS detections)
                associated_viirs = [c[0] for c in candidates]
                viirs_frps = [v.frp_mw for v in associated_viirs if v.frp_mw is not None]
                dists = [c[1] for c in candidates]
                times = [c[2] for c in candidates if c[2] is not None]
                scores = [c[3] for c in candidates]

                # Representative centroid: use high-res VIIRS centroid if available, else MODIS
                rep_lat = sum(v.latitude for v in associated_viirs) / len(associated_viirs)
                rep_lon = sum(v.longitude for v in associated_viirs) / len(associated_viirs)

                v_times = [v.acquisition_time_utc for v in associated_viirs if v.acquisition_time_utc]
                all_times = sorted([t for t in ([m.acquisition_time_utc] + v_times) if t])

                evt = HarmonizedEvent(
                    id=generate_event_id(m.acquisition_date, rep_lat, rep_lon, [m.id] + [v.id for v in associated_viirs]),
                    classification="MATCHED",
                    latitude=round(rep_lat, 4),
                    longitude=round(rep_lon, 4),
                    acquisition_date=m.acquisition_date,
                    earliest_acq_utc=all_times[0] if all_times else None,
                    latest_acq_utc=all_times[-1] if all_times else None,
                    modis_observation_ids=[m.id],
                    viirs_observation_ids=[v.id for v in associated_viirs],
                    modis_satellites=[m.satellite],
                    viirs_satellites=sorted(list({v.satellite for v in associated_viirs})),
                    modis_frp_mw=m.frp_mw,
                    viirs_total_frp_mw=round(sum(viirs_frps), 1) if viirs_frps else None,
                    viirs_individual_frps=viirs_frps,
                    spatial_distance_km=round(min(dists), 3) if dists else None,
                    temporal_difference_minutes=round(min(times), 1) if times else None,
                    match_score=round(sum(scores) / len(scores), 3) if scores else 0.8,
                    evidence_notes=f"MATCHED: 1 MODIS pixel ({m.satellite}) confirmed by {len(associated_viirs)} sub-pixel VIIRS detection(s).",
                    algorithm_version=self.ALGORITHM_VERSION,
                )
                events.append(evt)
                assigned_modis_ids.add(m.id)
                for v in associated_viirs:
                    assigned_viirs_ids.add(v.id)

        # Step B: MODIS_ONLY events for unmatched MODIS observations
        for m in modis_obs:
            if m.id in assigned_modis_ids:
                continue
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
                match_score=0.0,
                evidence_notes=f"MODIS_ONLY: No qualifying VIIRS observation within {self.spatial_threshold_km}km / {self.temporal_threshold_minutes}min window.",
                algorithm_version=self.ALGORITHM_VERSION,
            )
            events.append(evt)

        # Step C: VIIRS_ONLY events for unmatched VIIRS observations
        for v in viirs_obs:
            if v.id in assigned_viirs_ids:
                continue
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
                match_score=0.0,
                evidence_notes=f"VIIRS_ONLY: High-resolution hotspot without qualifying MODIS counterpart within {self.spatial_threshold_km}km / {self.temporal_threshold_minutes}min window.",
                algorithm_version=self.ALGORITHM_VERSION,
            )
            events.append(evt)

        # Compute summary statistics
        matched_c = sum(1 for e in events if e.classification == "MATCHED")
        modis_only_c = sum(1 for e in events if e.classification == "MODIS_ONLY")
        viirs_only_c = sum(1 for e in events if e.classification == "VIIRS_ONLY")
        ambiguous_c = sum(1 for e in events if e.classification == "AMBIGUOUS")

        matched_distances = [e.spatial_distance_km for e in events if e.spatial_distance_km is not None]
        matched_times = [e.temporal_difference_minutes for e in events if e.temporal_difference_minutes is not None]
        matched_scores = [e.match_score for e in events if e.classification == "MATCHED"]

        stats = HarmonizationStats(
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
        )

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
