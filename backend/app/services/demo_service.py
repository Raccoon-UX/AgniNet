from datetime import datetime, timezone
from typing import List, Optional
from app.models.fire import NormalizedObservation, FireObservationsResponse
from app.services.parser import compute_kpis

# Synthetic fixture dataset modeling NASA FIRMS formats
RAW_DEMO_RECORDS = [
    {
        "id": "DEMO-AMZ-01",
        "latitude": -9.4215,
        "longitude": -54.8912,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "04:15",
        "satellite": "NOAA-20",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_NOAA20_NRT",
        "confidence": "high",
        "confidence_numeric": 94.0,
        "frp_mw": 412.8,
        "brightness_kelvin": 382.4,
        "bright_t31_kelvin": 301.2,
        "scan_angle": 1.1,
        "track_km": 0.38,
        "day_night": "N",
        "version": "2.0-NRT",
        "region": "Amazon Basin, Brazil",
    },
    {
        "id": "DEMO-AMZ-02",
        "latitude": -9.4280,
        "longitude": -54.8870,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "04:18",
        "satellite": "Aqua",
        "instrument": "MODIS",
        "sensor_source": "MODIS_NRT",
        "confidence": 88,
        "confidence_numeric": 88.0,
        "frp_mw": 385.0,
        "brightness_kelvin": 368.1,
        "bright_t31_kelvin": 298.5,
        "scan_angle": 1.4,
        "track_km": 1.0,
        "day_night": "N",
        "version": "6.1N",
        "region": "Amazon Basin, Brazil",
    },
    {
        "id": "DEMO-AMZ-03",
        "latitude": -16.4820,
        "longitude": -56.6340,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "04:30",
        "satellite": "NOAA-21",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_NOAA21_NRT",
        "confidence": "high",
        "confidence_numeric": 98.0,
        "frp_mw": 560.4,
        "brightness_kelvin": 398.2,
        "bright_t31_kelvin": 304.7,
        "scan_angle": 1.6,
        "track_km": 0.38,
        "day_night": "N",
        "version": "1.0-NRT",
        "region": "Pantanal, Brazil",
    },
    {
        "id": "DEMO-AFR-01",
        "latitude": -5.6120,
        "longitude": 19.8450,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "01:25",
        "satellite": "Suomi-NPP",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_SNPP_NRT",
        "confidence": "high",
        "confidence_numeric": 91.0,
        "frp_mw": 245.8,
        "brightness_kelvin": 356.4,
        "bright_t31_kelvin": 298.1,
        "scan_angle": 1.2,
        "track_km": 0.38,
        "day_night": "N",
        "version": "2.0-NRT",
        "region": "Congo Basin, DR Congo",
    },
    {
        "id": "DEMO-AFR-02",
        "latitude": -8.2310,
        "longitude": 17.1420,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "01:15",
        "satellite": "Aqua",
        "instrument": "MODIS",
        "sensor_source": "MODIS_NRT",
        "confidence": 84,
        "confidence_numeric": 84.0,
        "frp_mw": 130.5,
        "brightness_kelvin": 342.1,
        "bright_t31_kelvin": 294.6,
        "scan_angle": 1.5,
        "track_km": 1.0,
        "day_night": "N",
        "version": "6.1N",
        "region": "Miombo Woodland, Angola",
    },
    {
        "id": "DEMO-USA-01",
        "latitude": 40.4280,
        "longitude": -121.2850,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "03:10",
        "satellite": "NOAA-20",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_NOAA20_NRT",
        "confidence": "high",
        "confidence_numeric": 99.0,
        "frp_mw": 785.4,
        "brightness_kelvin": 418.5,
        "bright_t31_kelvin": 310.2,
        "scan_angle": 1.0,
        "track_km": 0.38,
        "day_night": "N",
        "version": "2.0-NRT",
        "region": "Sierra Nevada, California, USA",
    },
    {
        "id": "DEMO-USA-02",
        "latitude": 38.8920,
        "longitude": -120.4120,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "03:15",
        "satellite": "Aqua",
        "instrument": "MODIS",
        "sensor_source": "MODIS_NRT",
        "confidence": 89,
        "confidence_numeric": 89.0,
        "frp_mw": 320.0,
        "brightness_kelvin": 362.4,
        "bright_t31_kelvin": 297.0,
        "scan_angle": 1.4,
        "track_km": 1.0,
        "day_night": "N",
        "version": "6.1N",
        "region": "California Foothills, USA",
    },
    {
        "id": "DEMO-SEA-01",
        "latitude": -1.8420,
        "longitude": 103.4810,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "01:45",
        "satellite": "NOAA-20",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_NOAA20_NRT",
        "confidence": "high",
        "confidence_numeric": 96.0,
        "frp_mw": 480.2,
        "brightness_kelvin": 378.6,
        "bright_t31_kelvin": 302.4,
        "scan_angle": 0.9,
        "track_km": 0.38,
        "day_night": "N",
        "version": "2.0-NRT",
        "region": "Sumatra, Indonesia",
    },
    {
        "id": "DEMO-AUS-01",
        "latitude": -13.8410,
        "longitude": 131.9540,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "02:15",
        "satellite": "NOAA-20",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_NOAA20_NRT",
        "confidence": "high",
        "confidence_numeric": 97.0,
        "frp_mw": 365.4,
        "brightness_kelvin": 384.2,
        "bright_t31_kelvin": 305.1,
        "scan_angle": 1.2,
        "track_km": 0.38,
        "day_night": "N",
        "version": "2.0-NRT",
        "region": "Top End, Australia",
    },
    {
        "id": "DEMO-EUR-01",
        "latitude": 38.1250,
        "longitude": 23.4120,
        "acquisition_date": "2026-11-14",
        "acquisition_time_utc": "01:40",
        "satellite": "Suomi-NPP",
        "instrument": "VIIRS",
        "sensor_source": "VIIRS_SNPP_NRT",
        "confidence": "high",
        "confidence_numeric": 92.0,
        "frp_mw": 284.1,
        "brightness_kelvin": 364.5,
        "bright_t31_kelvin": 299.1,
        "scan_angle": 1.0,
        "track_km": 0.38,
        "day_night": "N",
        "version": "2.0-NRT",
        "region": "Attica, Greece",
    },
]


def get_demo_observations(
    source_filter: Optional[str] = None,
    min_frp: Optional[float] = None,
    bbox: Optional[List[float]] = None,
) -> FireObservationsResponse:
    """Returns standardized synthetic observations with explicit DEMO labelling."""
    results: List[NormalizedObservation] = []

    for item in RAW_DEMO_RECORDS:
        # Source filter
        if source_filter and source_filter.upper() != "ALL":
            sf = source_filter.upper()
            if sf == "MODIS" and item["instrument"] != "MODIS":
                continue
            if sf == "VIIRS" and item["instrument"] != "VIIRS":
                continue
            if sf in {"MODIS_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"} and item["sensor_source"] != sf:
                continue

        # Min FRP filter
        if min_frp is not None and (item["frp_mw"] or 0) < min_frp:
            continue

        # Bounding box filter [min_lon, min_lat, max_lon, max_lat]
        if bbox and len(bbox) == 4:
            min_lon, min_lat, max_lon, max_lat = bbox
            if not (min_lat <= item["latitude"] <= max_lat and min_lon <= item["longitude"] <= max_lon):
                continue

        obs = NormalizedObservation(
            id=item["id"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            acquisition_date=item["acquisition_date"],
            acquisition_time_utc=item["acquisition_time_utc"],
            satellite=item["satellite"],
            instrument=item["instrument"],  # type: ignore
            sensor_source=item["sensor_source"],
            confidence=item["confidence"],
            confidence_numeric=item["confidence_numeric"],
            frp_mw=item["frp_mw"],
            brightness_kelvin=item["brightness_kelvin"],
            bright_t31_kelvin=item["bright_t31_kelvin"],
            scan_angle=item["scan_angle"],
            track_km=item["track_km"],
            day_night=item["day_night"],  # type: ignore
            version=item["version"],
            region=item["region"],
            is_live=False,
            raw_fields={"mock": True, "fixture_id": item["id"]},
        )
        results.append(obs)

    kpis = compute_kpis(results)

    return FireObservationsResponse(
        is_live=False,
        data_source="DEMO_FIXTURES",
        fetched_at=datetime.now(timezone.utc).isoformat(),
        total_count=len(results),
        observations=results,
        kpis=kpis,
        attribution="AgniNet Synthetic FIRMS Fixtures (Demo Mode: Set NASA_FIRMS_MAP_KEY for Live Feeds)",
        notice="DEMO MODE: Showing synthetic test fixtures. Configure NASA_FIRMS_MAP_KEY in backend/.env to stream live satellite telemetry.",
        bounding_box=bbox,
        applied_source=source_filter or "ALL",
    )
