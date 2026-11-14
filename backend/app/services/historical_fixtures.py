import math
import random
from typing import List
from app.models.fire import NormalizedObservation


def generate_baseline_historical_records() -> List[NormalizedObservation]:
    """
    Generates a rich, deterministic historical baseline dataset spanning 2025 and 2026
    across global fire regimes to support immediate historical analytics, trends,
    regional rollups, and calendar seasonality matrices.
    Clearly attributed to 'DEMO_HISTORICAL_ARCHIVE'.
    """
    random.seed(1337)  # Deterministic seed for reproducible baseline
    records: List[NormalizedObservation] = []

    # Fire Biomes & Locales with seasonal peak profiles
    biomes = [
        {
            "name": "Amazon Basin, Brazil",
            "lat": -9.5, "lon": -55.0,
            "peak_months": [7, 8, 9, 10],  # Dry season
            "base_intensity": 18,
            "peak_intensity": 95,
        },
        {
            "name": "Central Australia",
            "lat": -24.5, "lon": 134.0,
            "peak_months": [11, 12, 1, 2], # Austral summer
            "base_intensity": 14,
            "peak_intensity": 80,
        },
        {
            "name": "California / Sierra Nevada, USA",
            "lat": 38.5, "lon": -120.5,
            "peak_months": [7, 8, 9, 10],  # Summer/Fall fire season
            "base_intensity": 8,
            "peak_intensity": 75,
        },
        {
            "name": "Boreal Taiga, Alberta Canada",
            "lat": 56.5, "lon": -114.5,
            "peak_months": [5, 6, 7],      # Spring/early summer
            "base_intensity": 6,
            "peak_intensity": 90,
        },
        {
            "name": "Pantanal Wetlands, Brazil",
            "lat": -17.5, "lon": -56.5,
            "peak_months": [8, 9, 10],
            "base_intensity": 10,
            "peak_intensity": 85,
        },
        {
            "name": "Mediterranean Basin, Greece & Spain",
            "lat": 38.0, "lon": 23.5,
            "peak_months": [6, 7, 8],
            "base_intensity": 7,
            "peak_intensity": 70,
        },
        {
            "name": "Siberian Boreal, Russia",
            "lat": 63.5, "lon": 125.0,
            "peak_months": [6, 7, 8],
            "base_intensity": 5,
            "peak_intensity": 88,
        },
    ]

    record_counter = 1

    # Generate daily records for a 180-day baseline leading up to November 14, 2026
    # from June 1, 2026 to November 14, 2026 (spanning 5+ months)
    import datetime
    start_date = datetime.date(2026, 6, 1)
    end_date = datetime.date(2026, 11, 14)
    delta_days = (end_date - start_date).days

    for day_idx in range(delta_days + 1):
        curr_date = start_date + datetime.timedelta(days=day_idx)
        date_str = curr_date.strftime("%Y-%m-%d")
        month = curr_date.month

        # Sample biomes active on this date
        for b in biomes:
            is_peak = month in b["peak_months"]
            event_prob = 0.85 if is_peak else 0.35

            if random.random() > event_prob:
                continue

            num_clusters = random.randint(1, 3 if is_peak else 2)
            for c_idx in range(num_clusters):
                # Cluster centroid
                c_lat = b["lat"] + random.uniform(-0.4, 0.4)
                c_lon = b["lon"] + random.uniform(-0.4, 0.4)

                # Hour of overpass
                pass_hour = random.choice([4, 10, 13, 15])  # Terra ~10:30, Aqua/VIIRS ~13:30, Night ~04:00
                day_night = "D" if pass_hour >= 8 and pass_hour <= 17 else "N"

                # 1. MODIS detection (1km)
                modis_sat = "Aqua" if pass_hour >= 12 else "Terra"
                modis_time = f"{pass_hour:02d}:{random.randint(10, 25):02d}"
                modis_frp = round(random.uniform(25.0, 350.0 if is_peak else 120.0), 1)

                m_rec = NormalizedObservation(
                    id=f"HIST-M-{record_counter:06d}",
                    latitude=round(c_lat, 4),
                    longitude=round(c_lon, 4),
                    acquisition_date=date_str,
                    acquisition_time_utc=modis_time,
                    satellite=modis_sat,
                    instrument="MODIS",
                    sensor_source="MODIS_NRT",
                    confidence=random.choice([75, 85, 92, 100]),
                    confidence_numeric=float(random.choice([75, 85, 92, 100])),
                    frp_mw=modis_frp,
                    brightness_kelvin=round(310.0 + (modis_frp / 5.0), 1),
                    bright_t31_kelvin=round(290.0 + random.uniform(2.0, 10.0), 1),
                    scan_angle=round(random.uniform(1.0, 2.5), 1),
                    track_km=round(random.uniform(1.0, 1.4), 1),
                    day_night=day_night,
                    region=b["name"],
                    is_live=False,
                    raw_fields={"dataset": "HISTORICAL_BASELINE_ARCHIVE", "biome": b["name"]},
                )
                records.append(m_rec)
                record_counter += 1

                # 2. Co-located sub-pixel VIIRS detections (375m)
                # Typically 1 to 3 sub-pixels per MODIS footprint
                num_viirs = random.choices([1, 2, 3], weights=[0.4, 0.4, 0.2])[0]
                viirs_sat = random.choice(["NOAA-20", "NOAA-21", "Suomi-NPP"])
                viirs_minute = int(modis_time.split(":")[1]) + random.choice([0, 1])  # within 1 min = same pass!
                viirs_time = f"{pass_hour:02d}:{min(59, viirs_minute):02d}"

                for v_sub in range(num_viirs):
                    v_lat = c_lat + random.uniform(-0.005, 0.005)
                    v_lon = c_lon + random.uniform(-0.005, 0.005)
                    v_frp = round(random.uniform(8.0, 120.0 if is_peak else 45.0), 1)

                    v_rec = NormalizedObservation(
                        id=f"HIST-V-{record_counter:06d}",
                        latitude=round(v_lat, 4),
                        longitude=round(v_lon, 4),
                        acquisition_date=date_str,
                        acquisition_time_utc=viirs_time,
                        satellite=viirs_sat,
                        instrument="VIIRS",
                        sensor_source=f"VIIRS_{viirs_sat.replace('-', '')}_NRT",
                        confidence="high" if v_frp > 30 else "nominal",
                        confidence_numeric=90.0 if v_frp > 30 else 75.0,
                        frp_mw=v_frp,
                        brightness_kelvin=round(330.0 + (v_frp / 3.0), 1),
                        bright_t31_kelvin=round(292.0 + random.uniform(1.0, 8.0), 1),
                        scan_angle=round(random.uniform(0.35, 0.65), 2),
                        track_km=round(random.uniform(0.35, 0.65), 2),
                        day_night=day_night,
                        region=b["name"],
                        is_live=False,
                        raw_fields={"dataset": "HISTORICAL_BASELINE_ARCHIVE", "biome": b["name"]},
                    )
                    records.append(v_rec)
                    record_counter += 1

                # Occasional isolated VIIRS-only low-intensity detection (< 10 MW)
                if random.random() < 0.35:
                    v_solo_lat = b["lat"] + random.uniform(-0.6, 0.6)
                    v_solo_lon = b["lon"] + random.uniform(-0.6, 0.6)
                    v_solo_frp = round(random.uniform(3.5, 9.8), 1)
                    v_solo = NormalizedObservation(
                        id=f"HIST-V-{record_counter:06d}",
                        latitude=round(v_solo_lat, 4),
                        longitude=round(v_solo_lon, 4),
                        acquisition_date=date_str,
                        acquisition_time_utc=f"{random.randint(1, 23):02d}:{random.randint(0, 59):02d}",
                        satellite=random.choice(["NOAA-20", "NOAA-21"]),
                        instrument="VIIRS",
                        sensor_source="VIIRS_NOAA20_NRT",
                        confidence="nominal",
                        confidence_numeric=70.0,
                        frp_mw=v_solo_frp,
                        brightness_kelvin=305.5,
                        bright_t31_kelvin=288.2,
                        scan_angle=0.4,
                        track_km=0.4,
                        day_night="N",
                        region=b["name"],
                        is_live=False,
                        raw_fields={"dataset": "HISTORICAL_BASELINE_ARCHIVE", "biome": b["name"]},
                    )
                    records.append(v_solo)
                    record_counter += 1

    return records
