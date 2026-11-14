import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Tuple
from app.db.database import init_db
from app.db.historical_repo import HistoricalRepository
from app.models.fire import NormalizedObservation
from app.models.harmonization import HarmonizedEvent
from app.models.history import (
    HistoricalCalendarDay,
    HistoricalCalendarResponse,
    HistoricalEventsResponse,
    HistoricalIngestionResponse,
    HistoricalRegionStat,
    HistoricalRegionsResponse,
    HistoricalSensorStat,
    HistoricalSensorsResponse,
    HistoricalSummary,
    HistoricalTrendPoint,
    HistoricalTrendsResponse,
)
from app.services.harmonizer import HarmonizationEngine
from app.services.historical_fixtures import generate_baseline_historical_records

logger = logging.getLogger("historical_service")


class HistoricalService:
    """Core domain service for historical fire intelligence, storage, and trend analytics."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path
        init_db(self.db_path)
        self.repo = HistoricalRepository(self.db_path)
        self._ensure_baseline_seeded()

    def _ensure_baseline_seeded(self) -> None:
        """Seeds the historical archive with baseline multi-month records if storage is empty."""
        try:
            count = self.repo.count_observations()
            if count == 0:
                logger.info("Initializing historical archive with baseline multi-month fixture records...")
                records = generate_baseline_historical_records()
                self.repo.upsert_observations(records, provenance="DEMO_HISTORICAL_ARCHIVE")
                logger.info(f"Seeded {len(records)} historical baseline observations into persistent store.")
        except Exception as e:
            logger.warning(f"Failed to auto-seed historical baseline: {e}")

    def ingest_observations(
        self,
        observations: List[NormalizedObservation],
        provenance: str = "NASA_FIRMS_ARCHIVE",
    ) -> HistoricalIngestionResponse:
        """Idempotently ingests observations into the historical archive."""
        inserted, updated = self.repo.upsert_observations(observations, provenance=provenance)
        now_str = datetime.now(timezone.utc).isoformat()
        return HistoricalIngestionResponse(
            status="SUCCESS",
            records_received=len(observations),
            records_inserted=inserted,
            records_updated=updated,
            timestamp_utc=now_str,
            provenance=provenance,
        )

    def _harmonize_filtered(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        instrument: Optional[str] = None,
        satellite: Optional[str] = None,
        region: Optional[str] = None,
        min_frp: Optional[float] = None,
        spatial_threshold_km: float = 2.0,
        temporal_threshold_minutes: float = 120.0,
    ) -> Tuple[List[NormalizedObservation], List[HarmonizedEvent]]:
        """Queries observations from repository and harmonizes them using AgniNet-Harmonize-v1.1.1."""
        raw_obs = self.repo.query_observations(
            start_date=start_date,
            end_date=end_date,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            instrument=instrument,
            satellite=satellite,
            region=region,
            min_frp=min_frp,
        )

        if not raw_obs:
            return [], []

        engine = HarmonizationEngine(
            spatial_threshold_km=spatial_threshold_km,
            temporal_threshold_minutes=temporal_threshold_minutes,
        )
        harm_res = engine.harmonize(raw_obs, is_live=False, data_source="NASA_FIRMS_ARCHIVE")
        return raw_obs, harm_res.events

    def _determine_provenance(self, raw_obs: List[NormalizedObservation]) -> Dict[str, Any]:
        """
        Calculates provenance metadata with strict auditability across empty,
        demo-only, live-only, and mixed datasets.
        """
        if not raw_obs:
            return {
                "data_source": "EMPTY_ARCHIVE",
                "is_live": False,
                "is_synthetic": False,
                "provenance": "AgniNet-Historical-Pipeline-v1.1 (Empty Store)",
            }

        live_count = sum(1 for o in raw_obs if o.is_live)
        synthetic_count = len(raw_obs) - live_count

        if live_count == len(raw_obs):
            return {
                "data_source": "NASA_FIRMS_LIVE_ARCHIVE",
                "is_live": True,
                "is_synthetic": False,
                "provenance": f"NASA_FIRMS_ARCHIVE (Authenticated Telemetry Archive, {live_count} records)",
            }
        elif synthetic_count == len(raw_obs):
            return {
                "data_source": "DEMO_HISTORICAL_ARCHIVE",
                "is_live": False,
                "is_synthetic": True,
                "provenance": f"DEMO_HISTORICAL_ARCHIVE (Synthetically Modeled Historical Regime, {synthetic_count} records)",
            }
        else:
            return {
                "data_source": "MIXED_HISTORICAL_ARCHIVE",
                "is_live": False,
                "is_synthetic": True,
                "provenance": f"MIXED_ARCHIVE ({live_count} Live NASA Observations, {synthetic_count} Synthetic Fixtures)",
            }

    def get_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        instrument: Optional[str] = None,
        satellite: Optional[str] = None,
        region: Optional[str] = None,
        min_frp: Optional[float] = None,
        spatial_threshold_km: float = 2.0,
        temporal_threshold_minutes: float = 120.0,
    ) -> HistoricalSummary:
        """Generates statistical summary KPI roll-up for the requested historical query."""
        raw_obs, events = self._harmonize_filtered(
            start_date=start_date,
            end_date=end_date,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            instrument=instrument,
            satellite=satellite,
            region=region,
            min_frp=min_frp,
            spatial_threshold_km=spatial_threshold_km,
            temporal_threshold_minutes=temporal_threshold_minutes,
        )

        matched_c = sum(1 for e in events if e.classification == "MATCHED")
        modis_only_c = sum(1 for e in events if e.classification == "MODIS_ONLY")
        viirs_only_c = sum(1 for e in events if e.classification == "VIIRS_ONLY")
        ambiguous_c = sum(1 for e in events if e.classification == "AMBIGUOUS")

        # Strict FRP sensor separation: MODIS GW and VIIRS GW computed individually
        modis_frp_sum = sum(o.frp_mw for o in raw_obs if o.instrument == "MODIS" and o.frp_mw is not None)
        viirs_frp_sum = sum(o.frp_mw for o in raw_obs if o.instrument == "VIIRS" and o.frp_mw is not None)

        matched_scores = [e.match_score for e in events if e.classification == "MATCHED"]
        avg_score = round(sum(matched_scores) / len(matched_scores), 3) if matched_scores else None

        # Determine peak day
        daily_counts: Dict[str, int] = {}
        for e in events:
            daily_counts[e.acquisition_date] = daily_counts.get(e.acquisition_date, 0) + 1

        peak_day = None
        peak_events = 0
        if daily_counts:
            peak_day = max(daily_counts, key=daily_counts.get)  # type: ignore
            peak_events = daily_counts[peak_day]

        min_d, max_d = self.repo.get_date_bounds()
        effective_start = start_date or (min_d or "N/A")
        effective_end = end_date or (max_d or "N/A")

        platforms = sorted(list({o.satellite for o in raw_obs if o.satellite}))
        prov = self._determine_provenance(raw_obs)

        return HistoricalSummary(
            total_events=len(events),
            total_observations=len(raw_obs),
            matched_events=matched_c,
            modis_only_events=modis_only_c,
            viirs_only_events=viirs_only_c,
            ambiguous_events=ambiguous_c,
            modis_frp_gigawatts=round(modis_frp_sum / 1000.0, 2),
            viirs_frp_gigawatts=round(viirs_frp_sum / 1000.0, 2),
            average_match_score=avg_score,
            peak_day=peak_day,
            peak_day_events=peak_events,
            date_range_start=effective_start,
            date_range_end=effective_end,
            active_platforms=platforms,
            data_source=prov["data_source"],
            is_live=prov["is_live"],
            is_synthetic=prov["is_synthetic"],
            provenance=prov["provenance"],
        )

    def get_trends(
        self,
        granularity: Literal["day", "week", "month"] = "day",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        instrument: Optional[str] = None,
        satellite: Optional[str] = None,
        region: Optional[str] = None,
        min_frp: Optional[float] = None,
        spatial_threshold_km: float = 2.0,
        temporal_threshold_minutes: float = 120.0,
    ) -> HistoricalTrendsResponse:
        """Aggregates time-series trends by day, week, or month with strict sensor FRP separation."""
        raw_obs, events = self._harmonize_filtered(
            start_date=start_date,
            end_date=end_date,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            instrument=instrument,
            satellite=satellite,
            region=region,
            min_frp=min_frp,
            spatial_threshold_km=spatial_threshold_km,
            temporal_threshold_minutes=temporal_threshold_minutes,
        )

        def to_bucket(date_str: str) -> str:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if granularity == "month":
                    return dt.strftime("%Y-%m")
                elif granularity == "week":
                    iso_y, iso_w, _ = dt.isocalendar()
                    return f"{iso_y}-W{iso_w:02d}"
                return date_str
            except Exception:
                return date_str

        # Group events by bucket
        event_buckets: Dict[str, List[HarmonizedEvent]] = {}
        for e in events:
            b = to_bucket(e.acquisition_date)
            event_buckets.setdefault(b, []).append(e)

        # Group raw observations by bucket for accurate observation counts & sensor FRPs
        obs_buckets: Dict[str, List[NormalizedObservation]] = {}
        for o in raw_obs:
            b = to_bucket(o.acquisition_date)
            obs_buckets.setdefault(b, []).append(o)

        all_buckets = sorted(list(set(event_buckets.keys()) | set(obs_buckets.keys())))
        trend_points: List[HistoricalTrendPoint] = []

        for b in all_buckets:
            b_events = event_buckets.get(b, [])
            b_obs = obs_buckets.get(b, [])

            matched_c = sum(1 for e in b_events if e.classification == "MATCHED")
            modis_only_c = sum(1 for e in b_events if e.classification == "MODIS_ONLY")
            viirs_only_c = sum(1 for e in b_events if e.classification == "VIIRS_ONLY")
            ambiguous_c = sum(1 for e in b_events if e.classification == "AMBIGUOUS")

            modis_frp = sum(o.frp_mw for o in b_obs if o.instrument == "MODIS" and o.frp_mw is not None)
            viirs_frp = sum(o.frp_mw for o in b_obs if o.instrument == "VIIRS" and o.frp_mw is not None)

            confs = [o.confidence_numeric for o in b_obs if o.confidence_numeric is not None]
            avg_conf = round(sum(confs) / len(confs), 1) if confs else None

            trend_points.append(
                HistoricalTrendPoint(
                    date_bucket=b,
                    event_count=len(b_events),
                    observation_count=len(b_obs),
                    matched_count=matched_c,
                    modis_only_count=modis_only_c,
                    viirs_only_count=viirs_only_c,
                    ambiguous_count=ambiguous_c,
                    modis_frp_mw=round(modis_frp, 1),
                    viirs_frp_mw=round(viirs_frp, 1),
                    average_confidence=avg_conf,
                )
            )

        prov = self._determine_provenance(raw_obs)

        return HistoricalTrendsResponse(
            granularity=granularity,
            total_buckets=len(trend_points),
            trends=trend_points,
            data_source=prov["data_source"],
            is_live=prov["is_live"],
            is_synthetic=prov["is_synthetic"],
            provenance=prov["provenance"],
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )

    def get_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        instrument: Optional[str] = None,
        satellite: Optional[str] = None,
        region: Optional[str] = None,
        min_frp: Optional[float] = None,
    ) -> HistoricalCalendarResponse:
        """Generates daily thermal activity heatmap matrix with normalized intensity indices."""
        raw_obs, events = self._harmonize_filtered(
            start_date=start_date,
            end_date=end_date,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            instrument=instrument,
            satellite=satellite,
            region=region,
            min_frp=min_frp,
        )

        # Map dates to observations and events
        obs_by_date: Dict[str, List[NormalizedObservation]] = {}
        for o in raw_obs:
            obs_by_date.setdefault(o.acquisition_date, []).append(o)

        events_by_date: Dict[str, List[HarmonizedEvent]] = {}
        for e in events:
            events_by_date.setdefault(e.acquisition_date, []).append(e)

        all_dates = sorted(list(set(obs_by_date.keys()) | set(events_by_date.keys())))
        prov = self._determine_provenance(raw_obs)

        if not all_dates:
            min_d, max_d = self.repo.get_date_bounds()
            return HistoricalCalendarResponse(
                days=[],
                total_days=0,
                max_daily_events=0,
                max_daily_modis_frp_mw=0.0,
                max_daily_viirs_frp_mw=0.0,
                peak_single_frp_mw=0.0,
                max_daily_frp_mw=0.0,
                date_range_start=start_date or (min_d or "N/A"),
                date_range_end=end_date or (max_d or "N/A"),
                data_source=prov["data_source"],
                is_live=prov["is_live"],
                is_synthetic=prov["is_synthetic"],
                provenance=prov["provenance"],
                fetched_at=datetime.now(timezone.utc).isoformat(),
            )

        # First pass to compute sensor-specific maxima for dimensionless normalization
        daily_max_modis_frp = 0.0
        daily_max_viirs_frp = 0.0
        daily_max_events = 0
        overall_peak_single_frp = 0.0

        for d in all_dates:
            d_obs = obs_by_date.get(d, [])
            d_evts = events_by_date.get(d, [])
            m_frp = sum(o.frp_mw for o in d_obs if o.instrument == "MODIS" and o.frp_mw is not None)
            v_frp = sum(o.frp_mw for o in d_obs if o.instrument == "VIIRS" and o.frp_mw is not None)
            frps = [o.frp_mw for o in d_obs if o.frp_mw is not None]

            daily_max_modis_frp = max(daily_max_modis_frp, m_frp)
            daily_max_viirs_frp = max(daily_max_viirs_frp, v_frp)
            daily_max_events = max(daily_max_events, len(d_evts))
            if frps:
                overall_peak_single_frp = max(overall_peak_single_frp, max(frps))

        calendar_days: List[HistoricalCalendarDay] = []
        for d in all_dates:
            d_obs = obs_by_date.get(d, [])
            d_evts = events_by_date.get(d, [])

            m_count = sum(1 for o in d_obs if o.instrument == "MODIS")
            v_count = sum(1 for o in d_obs if o.instrument == "VIIRS")
            m_frp = sum(o.frp_mw for o in d_obs if o.instrument == "MODIS" and o.frp_mw is not None)
            v_frp = sum(o.frp_mw for o in d_obs if o.instrument == "VIIRS" and o.frp_mw is not None)

            # Dimensionless Sensor-Normalized Intensity Index (0 to 100)
            # Physical Law: MODIS FRP (4.0µm, 1km) and VIIRS FRP (3.74/4.05µm, 375m)
            # MUST NEVER be summed. Each sensor component is scaled against its own
            # peak daily cumulative output across the observation period into a [0.0, 1.0] ratio.
            norm_modis = (m_frp / daily_max_modis_frp) if daily_max_modis_frp > 0 else 0.0
            norm_viirs = (v_frp / daily_max_viirs_frp) if daily_max_viirs_frp > 0 else 0.0

            if m_count > 0 and v_count > 0:
                severity_ratio = (norm_modis + norm_viirs) / 2.0
            elif m_count > 0:
                severity_ratio = norm_modis
            elif v_count > 0:
                severity_ratio = norm_viirs
            else:
                severity_ratio = 0.0

            intensity = int(min(100, round(severity_ratio * 100)))

            # Determine dominant sensor
            if m_count > v_count * 1.5:
                dominant = "MODIS"
            elif v_count > m_count * 1.5:
                dominant = "VIIRS"
            else:
                dominant = "COINCIDENT"

            peak_single = max([o.frp_mw for o in d_obs if o.frp_mw is not None] or [0.0])

            calendar_days.append(
                HistoricalCalendarDay(
                    date=d,
                    event_count=len(d_evts),
                    observation_count=len(d_obs),
                    intensity_index=intensity,
                    dominant_sensor=dominant,
                    modis_count=m_count,
                    viirs_count=v_count,
                    modis_frp_mw=round(m_frp, 1),
                    viirs_frp_mw=round(v_frp, 1),
                    peak_frp_mw=round(peak_single, 1),
                )
            )

        return HistoricalCalendarResponse(
            days=calendar_days,
            total_days=len(calendar_days),
            max_daily_events=daily_max_events,
            max_daily_modis_frp_mw=round(daily_max_modis_frp, 1),
            max_daily_viirs_frp_mw=round(daily_max_viirs_frp, 1),
            peak_single_frp_mw=round(overall_peak_single_frp, 1),
            max_daily_frp_mw=round(overall_peak_single_frp, 1),
            date_range_start=all_dates[0],
            date_range_end=all_dates[-1],
            data_source=prov["data_source"],
            is_live=prov["is_live"],
            is_synthetic=prov["is_synthetic"],
            provenance=prov["provenance"],
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )

    def get_regions(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_frp: Optional[float] = None,
    ) -> HistoricalRegionsResponse:
        """Rolls up historical fire statistics by geographic biome and region."""
        raw_obs, events = self._harmonize_filtered(
            start_date=start_date,
            end_date=end_date,
            min_frp=min_frp,
        )

        obs_map = {o.id: o for o in raw_obs}
        region_obs: Dict[str, List[NormalizedObservation]] = {}
        for o in raw_obs:
            r = o.region or "Unassigned Region"
            region_obs.setdefault(r, []).append(o)

        region_events: Dict[str, List[HarmonizedEvent]] = {}
        for e in events:
            # Map event to region of its first observation or representative
            first_obs_id = e.modis_observation_ids[0] if e.modis_observation_ids else (e.viirs_observation_ids[0] if e.viirs_observation_ids else None)
            matched_obs = obs_map.get(first_obs_id) if first_obs_id else None
            r = matched_obs.region if matched_obs and matched_obs.region else "Unassigned Region"
            region_events.setdefault(r, []).append(e)

        total_evts = len(events)
        all_regions = sorted(list(set(region_obs.keys()) | set(region_events.keys())))

        stats_list: List[HistoricalRegionStat] = []
        for r in all_regions:
            r_obs = region_obs.get(r, [])
            r_evts = region_events.get(r, [])

            m_frp = sum(o.frp_mw for o in r_obs if o.instrument == "MODIS" and o.frp_mw is not None)
            v_frp = sum(o.frp_mw for o in r_obs if o.instrument == "VIIRS" and o.frp_mw is not None)
            matched_c = sum(1 for e in r_evts if e.classification == "MATCHED")

            pct = round((len(r_evts) / total_evts) * 100.0, 1) if total_evts > 0 else 0.0

            stats_list.append(
                HistoricalRegionStat(
                    region_name=r,
                    event_count=len(r_evts),
                    observation_count=len(r_obs),
                    matched_count=matched_c,
                    modis_frp_mw=round(m_frp, 1),
                    viirs_frp_mw=round(v_frp, 1),
                    percentage_of_total=pct,
                )
            )

        # Sort by event count descending
        stats_list.sort(key=lambda s: s.event_count, reverse=True)
        prov = self._determine_provenance(raw_obs)

        return HistoricalRegionsResponse(
            regions=stats_list,
            total_events=total_evts,
            data_source=prov["data_source"],
            is_live=prov["is_live"],
            is_synthetic=prov["is_synthetic"],
            provenance=prov["provenance"],
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )

    def get_sensors(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_frp: Optional[float] = None,
    ) -> HistoricalSensorsResponse:
        """Computes platform and sensor comparison metrics across spacecraft."""
        raw_obs, _ = self._harmonize_filtered(
            start_date=start_date,
            end_date=end_date,
            min_frp=min_frp,
        )

        obs_by_sat: Dict[str, List[NormalizedObservation]] = {}
        for o in raw_obs:
            obs_by_sat.setdefault(o.satellite, []).append(o)

        total_obs = len(raw_obs)
        modis_count = sum(1 for o in raw_obs if o.instrument == "MODIS")
        viirs_count = sum(1 for o in raw_obs if o.instrument == "VIIRS")

        sensor_stats: List[HistoricalSensorStat] = []
        for sat, s_obs in sorted(obs_by_sat.items()):
            inst = s_obs[0].instrument
            src = s_obs[0].sensor_source

            day_c = sum(1 for o in s_obs if o.day_night == "D")
            night_c = sum(1 for o in s_obs if o.day_night == "N")

            frps = [o.frp_mw for o in s_obs if o.frp_mw is not None]
            total_frp = sum(frps)
            mean_frp = round(total_frp / len(frps), 1) if frps else None
            max_frp = max(frps) if frps else None

            confs = [o.confidence_numeric for o in s_obs if o.confidence_numeric is not None]
            avg_conf = round(sum(confs) / len(confs), 1) if confs else None

            pct = round((len(s_obs) / total_obs) * 100.0, 1) if total_obs > 0 else 0.0

            sensor_stats.append(
                HistoricalSensorStat(
                    satellite=sat,
                    instrument=inst,
                    sensor_source=src,
                    observation_count=len(s_obs),
                    share_percentage=pct,
                    daytime_count=day_c,
                    nighttime_count=night_c,
                    total_frp_mw=round(total_frp, 1),
                    mean_frp_mw=mean_frp,
                    max_frp_mw=max_frp,
                    average_confidence=avg_conf,
                )
            )

        # Sort by observation count descending
        sensor_stats.sort(key=lambda s: s.observation_count, reverse=True)
        prov = self._determine_provenance(raw_obs)

        return HistoricalSensorsResponse(
            sensors=sensor_stats,
            total_observations=total_obs,
            modis_observation_count=modis_count,
            viirs_observation_count=viirs_count,
            data_source=prov["data_source"],
            is_live=prov["is_live"],
            is_synthetic=prov["is_synthetic"],
            provenance=prov["provenance"],
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )

    def get_events(
        self,
        page: int = 1,
        page_size: int = 25,
        classification: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        min_frp: Optional[float] = None,
    ) -> HistoricalEventsResponse:
        """Returns paginated historical unified fire events."""
        page = max(1, page)
        page_size = max(1, min(200, page_size))

        raw_obs, events = self._harmonize_filtered(
            start_date=start_date,
            end_date=end_date,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            min_frp=min_frp,
        )

        if classification:
            events = [e for e in events if e.classification == classification]

        total_evts = len(events)
        total_pages = max(1, (total_evts + page_size - 1) // page_size) if total_evts > 0 else 1
        offset = (page - 1) * page_size
        paginated = events[offset : offset + page_size]

        prov = self._determine_provenance(raw_obs)

        return HistoricalEventsResponse(
            events=paginated,
            total_events=total_evts,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            data_source=prov["data_source"],
            is_live=prov["is_live"],
            is_synthetic=prov["is_synthetic"],
            provenance=prov["provenance"],
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )


# Global singleton instance for application use
historical_service = HistoricalService()
