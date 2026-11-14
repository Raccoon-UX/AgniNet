import random
import time
from typing import List
from app.models.fire import NormalizedObservation
from app.services.harmonizer import HarmonizationEngine


def generate_synthetic_batch(
    total_count: int,
    modis_ratio: float = 0.25,
    seed: int = 42,
) -> List[NormalizedObservation]:
    """Generates synthetic observations distributed across typical fire clusters."""
    random.seed(seed)
    observations: List[NormalizedObservation] = []
    modis_target = int(total_count * modis_ratio)
    viirs_target = total_count - modis_target

    # Create several geographic cluster centers
    cluster_centers = [
        (-25.0, 133.0),   # Central Australia
        (-33.8, 150.0),   # Blue Mountains, NSW
        (37.5, -120.0),   # California Central Valley
        (55.0, -115.0),   # Alberta, Canada
        (-3.0, -60.0),    # Amazon Basin
    ]

    for i in range(modis_target):
        center = random.choice(cluster_centers)
        lat = center[0] + random.uniform(-0.5, 0.5)
        lon = center[1] + random.uniform(-0.5, 0.5)
        hour = random.randint(10, 14)
        minute = random.randint(0, 59)
        obs = NormalizedObservation(
            id=f"M_{i:05d}",
            latitude=round(lat, 4),
            longitude=round(lon, 4),
            acquisition_date="2026-05-01",
            acquisition_time_utc=f"{hour:02d}:{minute:02d}",
            satellite=random.choice(["Aqua", "Terra"]),
            instrument="MODIS",
            sensor_source="MODIS_NRT",
            frp_mw=round(random.uniform(5.0, 300.0), 1),
            scan_angle=round(random.uniform(1.0, 3.5), 1),
            track_km=round(random.uniform(1.0, 1.8), 1),
        )
        observations.append(obs)

    for j in range(viirs_target):
        center = random.choice(cluster_centers)
        lat = center[0] + random.uniform(-0.5, 0.5)
        lon = center[1] + random.uniform(-0.5, 0.5)
        hour = random.randint(10, 14)
        minute = random.randint(0, 59)
        obs = NormalizedObservation(
            id=f"V_{j:05d}",
            latitude=round(lat, 4),
            longitude=round(lon, 4),
            acquisition_date="2026-05-01",
            acquisition_time_utc=f"{hour:02d}:{minute:02d}",
            satellite=random.choice(["Suomi-NPP", "NOAA-20", "NOAA-21"]),
            instrument="VIIRS",
            sensor_source="VIIRS_NOAA20_NRT",
            frp_mw=round(random.uniform(1.0, 120.0), 1),
            scan_angle=round(random.uniform(0.35, 0.75), 2),
            track_km=round(random.uniform(0.35, 0.75), 2),
        )
        observations.append(obs)

    random.shuffle(observations)
    return observations


def run_benchmark():
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=120.0)
    batch_sizes = [100, 500, 1000, 2500, 5000]

    print("=" * 68)
    print(" AgniNet Harmonization Engine — Performance Benchmark")
    print(f" Algorithm Version: {HarmonizationEngine.ALGORITHM_VERSION}")
    print("=" * 68)
    print(f"{'Batch Size':<12} | {'MODIS':<8} | {'VIIRS':<8} | {'Events':<8} | {'Matched':<8} | {'Time (ms)':<10}")
    print("-" * 68)

    for size in batch_sizes:
        batch = generate_synthetic_batch(size)
        modis_c = sum(1 for o in batch if o.instrument == "MODIS")
        viirs_c = sum(1 for o in batch if o.instrument == "VIIRS")

        # Warm-up run
        _ = engine.harmonize(batch[:10])

        start = time.perf_counter()
        resp = engine.harmonize(batch)
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        print(f"{size:<12} | {modis_c:<8} | {viirs_c:<8} | {resp.stats.total_events:<8} | {resp.stats.matched_events:<8} | {elapsed_ms:>8.2f} ms")

    print("=" * 68)


if __name__ == "__main__":
    run_benchmark()
