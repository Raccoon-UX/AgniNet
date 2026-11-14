import csv
import io
import math
from typing import Any, Dict, List, Optional, Tuple
from app.models.fire import NormalizedObservation, ObservationKpis


def _safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _format_acq_time(raw_time: Any) -> str:
    """Formats 3 or 4-digit acquisition times e.g. '345' -> '03:45', '1420' -> '14:20'."""
    if raw_time is None:
        return "00:00"
    s = str(raw_time).strip().replace(":", "")
    if len(s) == 3:
        return f"0{s[0]}:{s[1:]}"
    elif len(s) >= 4:
        return f"{s[:2]}:{s[2:4]}"
    elif len(s) == 2:
        return f"00:{s}"
    elif len(s) == 1:
        return f"00:0{s}"
    return "00:00"


def _normalize_satellite_name(sat: str, instrument: str) -> str:
    s = str(sat).strip().upper()
    if s in {"T", "TERRA"}:
        return "Terra"
    if s in {"A", "AQUA"}:
        return "Aqua"
    if s in {"N", "NPP", "SNPP", "SUOMI-NPP"}:
        return "Suomi-NPP"
    if s in {"1", "NOAA-20", "JPSS-1", "NOAA20", "N20"}:
        return "NOAA-20"
    if s in {"2", "NOAA-21", "JPSS-2", "NOAA21", "N21"}:
        return "NOAA-21"
    
    # Fallback to instrument hints
    if instrument == "MODIS":
        return "Terra / Aqua"
    if instrument == "VIIRS":
        return "JPSS Constellation"
    return str(sat).strip() or "EOS / JPSS"


def _parse_confidence(conf_raw: Any, instrument: str) -> Tuple[Optional[Union[float, int, str]], Optional[float]]:
    """Returns (confidence_display, confidence_numeric_0_to_100)."""
    if conf_raw is None or str(conf_raw).strip() == "":
        return None, None
    
    s = str(conf_raw).strip().lower()
    
    # Try numeric float
    try:
        num = float(s)
        return int(num) if num.is_integer() else num, max(0.0, min(100.0, num))
    except ValueError:
        pass
    
    # VIIRS categorical mapping: 'l', 'n', 'h'
    if s in {"l", "low"}:
        return "low", 25.0
    if s in {"n", "nominal", "nom"}:
        return "nominal", 65.0
    if s in {"h", "high"}:
        return "high", 90.0
        
    return conf_raw, None


def parse_firms_csv(csv_text: str, source_id: str) -> List[NormalizedObservation]:
    """
    Parses raw NASA FIRMS CSV text into validated NormalizedObservation instances.
    Deduplicates records based on deterministic coordinates and acquisition timestamps.
    """
    if not csv_text or not csv_text.strip():
        return []

    observations: List[NormalizedObservation] = []
    seen_ids = set()

    # Determine instrument category
    is_modis = "MODIS" in source_id.upper()
    instrument = "MODIS" if is_modis else "VIIRS"

    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    if not reader.fieldnames:
        return []

    # Map column headers case-insensitively
    headers = {k.strip().lower(): k for k in reader.fieldnames if k}

    for row in reader:
        # Latitude & Longitude are mandatory
        lat_val = _safe_float(row.get(headers.get("latitude", "latitude")))
        lon_val = _safe_float(row.get(headers.get("longitude", "longitude")))

        if lat_val is None or lon_val is None:
            continue
        if lat_val < -90.0 or lat_val > 90.0 or lon_val < -180.0 or lon_val > 180.0:
            continue

        acq_date = str(row.get(headers.get("acq_date", "acq_date"), "")).strip() or "2026-01-01"
        raw_acq_time = row.get(headers.get("acq_time", "acq_time"))
        acq_time_fmt = _format_acq_time(raw_acq_time)

        # Build deterministic unique ID to deduplicate within the feed
        record_id = f"{source_id}_{lat_val:.4f}_{lon_val:.4f}_{acq_date}_{acq_time_fmt.replace(':', '')}"
        if record_id in seen_ids:
            continue
        seen_ids.add(record_id)

        # Thermal channels:
        # MODIS: 'brightness' (T21/T22) & 'bright_t31' (T31)
        # VIIRS: 'bright_ti4' (I4) & 'bright_ti5' (I5)
        bright_val = (
            _safe_float(row.get(headers.get("bright_ti4", "")))
            if "bright_ti4" in headers
            else _safe_float(row.get(headers.get("brightness", "")))
        )
        bright_t31_val = (
            _safe_float(row.get(headers.get("bright_ti5", "")))
            if "bright_ti5" in headers
            else _safe_float(row.get(headers.get("bright_t31", "")))
        )

        frp_val = _safe_float(row.get(headers.get("frp", "")))
        scan_val = _safe_float(row.get(headers.get("scan", "")))
        track_val = _safe_float(row.get(headers.get("track", "")))

        # Confidence
        conf_raw = row.get(headers.get("confidence", ""))
        conf_display, conf_numeric = _parse_confidence(conf_raw, instrument)

        # Satellite
        sat_raw = row.get(headers.get("satellite", ""))
        satellite = _normalize_satellite_name(sat_raw or "", instrument)

        # Day/Night
        dn_val = row.get(headers.get("daynight", ""))
        dn_clean: Optional[str] = None
        if dn_val:
            dn_first = str(dn_val).strip().upper()[:1]
            if dn_first in {"D", "N"}:
                dn_clean = dn_first

        # Version
        version_val = row.get(headers.get("version", ""))

        obs = NormalizedObservation(
            id=record_id,
            latitude=lat_val,
            longitude=lon_val,
            acquisition_date=acq_date,
            acquisition_time_utc=acq_time_fmt,
            satellite=satellite,
            instrument=instrument,
            sensor_source=source_id,
            confidence=conf_display,
            confidence_numeric=conf_numeric,
            frp_mw=frp_val,
            brightness_kelvin=bright_val,
            bright_t31_kelvin=bright_t31_val,
            scan_angle=scan_val,
            track_km=track_val,
            day_night=dn_clean,  # type: ignore
            version=str(version_val).strip() if version_val else None,
            is_live=True,
            raw_fields=dict(row),
        )
        observations.append(obs)

    return observations


def compute_kpis(observations: List[NormalizedObservation]) -> ObservationKpis:
    """Calculates summary KPIs over a list of normalized fire observations."""
    total = len(observations)
    if total == 0:
        return ObservationKpis(
            total_hotspots=0,
            modis_count=0,
            viirs_count=0,
            total_frp_mw=0.0,
            avg_confidence=None,
            max_frp_mw=None,
            daytime_count=0,
            nighttime_count=0,
        )

    modis_c = sum(1 for o in observations if o.instrument == "MODIS")
    viirs_c = sum(1 for o in observations if o.instrument == "VIIRS")
    day_c = sum(1 for o in observations if o.day_night == "D")
    night_c = sum(1 for o in observations if o.day_night == "N")

    frp_vals = [o.frp_mw for o in observations if o.frp_mw is not None and o.frp_mw >= 0]
    total_frp = sum(frp_vals)
    max_frp = max(frp_vals) if frp_vals else None

    conf_vals = [o.confidence_numeric for o in observations if o.confidence_numeric is not None]
    avg_conf = (sum(conf_vals) / len(conf_vals)) if conf_vals else None

    return ObservationKpis(
        total_hotspots=total,
        modis_count=modis_c,
        viirs_count=viirs_c,
        total_frp_mw=round(total_frp, 1),
        avg_confidence=round(avg_conf, 1) if avg_conf is not None else None,
        max_frp_mw=round(max_frp, 1) if max_frp is not None else None,
        daytime_count=day_c,
        nighttime_count=night_c,
    )
