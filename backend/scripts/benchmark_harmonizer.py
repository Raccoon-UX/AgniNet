import math
import random
import statistics
import time
from typing import Dict, List, Set, Tuple
from app.models.fire import NormalizedObservation
from app.services.harmonizer import (
    HarmonizationEngine,
    SpatialCandidateIndex,
    get_effective_footprint_radius_km,
    haversine_km,
)


def generate_benchmark_dataset(
    total_count: int,
    modis_ratio: float = 0.25,
    seed: int = 42,
    density: str = "mixed",
) -> List[NormalizedObservation]:
    """
    Generates deterministic synthetic observations across realistic geographic distributions:
    - Equatorial: Amazon, Congo, Central Australia
    - Mid-latitude: California, Mediterranean
    - Antimeridian: Pacific / Fiji / Kamchatka (spanning +/-180 deg)
    - Polar / High-latitude: Yukon / Siberia (70 to 86 deg N)
    Supports 'sparse', 'dense', and 'mixed' cluster densities.
    """
    random.seed(seed)
    observations: List[NormalizedObservation] = []
    modis_target = int(total_count * modis_ratio)
    viirs_target = total_count - modis_target

    # Geographic regions
    cluster_centers = [
        # Equatorial
        (-25.0, 133.0, "Central Australia"),
        (-3.5, -62.0, "Amazon Basin"),
        # Mid-latitude
        (37.5, -120.0, "California"),
        (-33.8, 150.0, "NSW Australia"),
        # Antimeridian (+/-180 deg)
        (15.0, 179.9, "Pacific Antimeridian East"),
        (15.0, -179.9, "Pacific Antimeridian West"),
        # High Latitude / Polar
        (72.0, 130.0, "Siberian Tundra"),
        (84.0, -45.0, "Northern Greenland Polar Cap"),
    ]

    spread = 0.05 if density == "dense" else (0.8 if density == "sparse" else 0.3)

    for i in range(modis_target):
        center = random.choice(cluster_centers)
        lat = max(-89.9, min(89.9, center[0] + random.uniform(-spread, spread)))
        raw_lon = center[1] + random.uniform(-spread, spread)
        lon = ((raw_lon + 180.0) % 360.0) - 180.0

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
        lat = max(-89.9, min(89.9, center[0] + random.uniform(-spread, spread)))
        raw_lon = center[1] + random.uniform(-spread, spread)
        lon = ((raw_lon + 180.0) % 360.0) - 180.0

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


def verify_candidate_recall_against_brute_force(
    batch: List[NormalizedObservation],
    spatial_threshold_km: float = 2.0,
) -> Tuple[int, int, int]:
    """
    Exhaustively compares SpatialCandidateIndex against brute-force O(N_M * N_V).
    Returns (total_valid_pairs, retrieved_valid_pairs, missed_pairs).
    """
    modis_obs = [o for o in batch if o.instrument == "MODIS"]
    viirs_obs = [o for o in batch if o.instrument == "VIIRS"]

    # 1. Brute-force ground truth pairs
    brute_valid_pairs: Set[Tuple[str, str]] = set()
    for m in modis_obs:
        m_r = get_effective_footprint_radius_km(m)
        for v in viirs_obs:
            eff_d = max(spatial_threshold_km, m_r + get_effective_footprint_radius_km(v))
            d = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
            if d <= eff_d:
                brute_valid_pairs.add((m.id, v.id))

    # 2. Spatial index candidate pairs
    index = SpatialCandidateIndex(viirs_obs, cell_size_deg=0.5)
    index_valid_pairs: Set[Tuple[str, str]] = set()
    for m in modis_obs:
        m_r = get_effective_footprint_radius_km(m)
        max_search = max(spatial_threshold_km, m_r + 0.8)
        candidates = index.query_candidates(m, max_search)
        for v in candidates:
            eff_d = max(spatial_threshold_km, m_r + get_effective_footprint_radius_km(v))
            d = haversine_km(m.latitude, m.longitude, v.latitude, v.longitude)
            if d <= eff_d:
                index_valid_pairs.add((m.id, v.id))

    missed = brute_valid_pairs - index_valid_pairs
    return len(brute_valid_pairs), len(index_valid_pairs), len(missed)


def run_benchmark_suite():
    engine = HarmonizationEngine(spatial_threshold_km=2.0, temporal_threshold_minutes=120.0)
    batch_sizes = [100, 500, 1000, 2500, 5000]
    iterations = 5

    print("=" * 84)
    print(" AgniNet Cross-Sensor Harmonization — Rigorous Benchmark & Recall Verification")
    print(f" Algorithm Version: {HarmonizationEngine.ALGORITHM_VERSION}")
    print(" Environments: Equatorial, Mid-Latitude, Antimeridian (+/-180 deg), Polar Cap (70-86 deg N)")
    print("=" * 84)

    # 1. Correctness & Recall Verification
    print("\n--- 1. Candidate Index vs Brute-Force Recall Verification ---")
    print(f"{'Batch Size':<12} | {'Brute Pairs':<12} | {'Index Pairs':<12} | {'Missed Pairs':<12} | {'Recall':<8}")
    print("-" * 64)
    for size in [100, 500, 1000]:
        batch = generate_benchmark_dataset(size, seed=100 + size)
        b_count, i_count, missed = verify_candidate_recall_against_brute_force(batch)
        recall_pct = 100.0 if b_count == 0 else ((b_count - missed) / b_count) * 100.0
        print(f"{size:<12} | {b_count:<12} | {i_count:<12} | {missed:<12} | {recall_pct:>6.2f}%")
        assert missed == 0, f"Critical Defect: Spatial index missed {missed} valid pairs!"

    print("\n[OK] 100.0% Candidate Recall Verified across all test regimes.")

    # 2. Latency & Throughput Benchmark
    print("\n--- 2. Latency & Throughput Performance Benchmark (5 Measured Runs) ---")
    print(f"{'Batch':<8} | {'Density':<8} | {'Median(ms)':<11} | {'p95(ms)':<10} | {'Max(ms)':<10} | {'Throughput':<12} | {'Events':<8}")
    print("-" * 84)

    for size in batch_sizes:
        for dens in (["mixed", "dense"] if size in [500, 2500] else ["mixed"]):
            batch = generate_benchmark_dataset(size, seed=42 + size, density=dens)

            # Warm-up run
            _ = engine.harmonize(batch[:50])

            latencies = []
            final_resp = None
            for _ in range(iterations):
                start = time.perf_counter()
                final_resp = engine.harmonize(batch)
                latencies.append((time.perf_counter() - start) * 1000.0)

            latencies.sort()
            median_ms = statistics.median(latencies)
            p95_ms = latencies[int(math.ceil(0.95 * len(latencies))) - 1]
            max_ms = max(latencies)
            throughput = size / (median_ms / 1000.0)

            print(
                f"{size:<8} | {dens:<8} | {median_ms:>9.2f} ms | {p95_ms:>8.2f} ms | "
                f"{max_ms:>8.2f} ms | {throughput:>8.0f} obs/s | {final_resp.stats.total_events:<8}"
            )

    print("=" * 84)
    print("DISCLAIMER: These measurements evaluate synthetic datasets under local CPU execution.")
    print("Real NASA FIRMS live streaming latencies are dominated by upstream HTTP transfer and network I/O.")
    print("=" * 84)


if __name__ == "__main__":
    run_benchmark_suite()
