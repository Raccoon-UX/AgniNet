# AgniNet — Phase 4 Readiness & Integration Specification

**Document Classification:** API Freeze, Integration Contract & Historical Analytics Baseline  
**Target Milestone:** Phase 4 — Historical Trends, Multi-Temporal Archives & Analytics  
**Date:** November 2026  
**Status:** APPROVED FOR PHASE 4 ONBOARDING  

---

## 1. Overview & Purpose

This document establishes the frozen API contracts, data schemas, classification semantics, and integration protocols required for **Phase 4: Historical Analysis & Trend Intelligence**.

All components implemented in Phase 1 (Frontend Dashboard), Phase 2 (Live NASA FIRMS Pipeline), and Phase 3/3.1/3.1.1 (Cross-Sensor Spatial-Temporal Harmonization Engine) are validated and frozen. Phase 4 will ingest and analyze multi-day and multi-year fire observation archives without altering the underlying normalization or harmonization algorithms.

---

## 2. Frozen API Endpoints & Response Contracts

The AgniNet backend exposes the following stable REST endpoints for ingestion, exploration, and historical querying:

### 2.1 `/api/harmonization/events`
- **Method:** `GET`
- **Purpose:** Primary endpoint for retrieving unified, cross-sensor harmonized active-fire events.
- **Query Parameters:**
  - `source`: Sensor filter (`ALL`, `MODIS_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `VIIRS_SNPP_NRT`). Default: `ALL`.
  - `min_lon`, `min_lat`, `max_lon`, `max_lat`: Bounding box in WGS84 degrees.
  - `day_range`: Days backward from date (1 to 10).
  - `date`: Primary calendar date (`YYYY-MM-DD`).
  - `min_frp`: Minimum Fire Radiative Power (MW) threshold filter.
  - `spatial_threshold_km`: Maximum spatial association radius (0.1 to 50.0 km). Default: `2.0`.
  - `temporal_threshold_minutes`: Maximum synchronization delta (1.0 to 1440.0 min). Default: `120.0`.
  - `classification`: Optional classification filter (`MATCHED`, `MODIS_ONLY`, `VIIRS_ONLY`, `AMBIGUOUS`).
  - `demo`: Boolean. Force demo synthetic fixtures instead of upstream NASA FIRMS.
- **Response Schema:** `HarmonizationResponse`
  ```json
  {
    "events": [
      {
        "id": "AGNI-EVT-20260501-15.00N_120.00E-a1b2c3d4",
        "classification": "MATCHED",
        "latitude": 15.0021,
        "longitude": 120.0015,
        "acquisition_date": "2026-05-01",
        "earliest_acq_utc": "04:15",
        "latest_acq_utc": "04:16",
        "modis_observation_ids": ["MODIS_NRT_..."],
        "viirs_observation_ids": ["VIIRS_NOAA20_NRT_..."],
        "modis_satellites": ["Aqua"],
        "viirs_satellites": ["NOAA-20"],
        "modis_frp_mw": 85.4,
        "viirs_total_frp_mw": 92.1,
        "viirs_individual_frps": [48.0, 44.1],
        "spatial_distance_km": 0.421,
        "temporal_difference_minutes": 1.0,
        "spatial_score": 0.895,
        "temporal_score": 0.992,
        "match_score": 0.939,
        "evidence_notes": "MATCHED: 1 MODIS pixel (Aqua) confirmed by 2 sub-pixel VIIRS detection(s).",
        "algorithm_version": "AgniNet-Harmonize-v1.1.1"
      }
    ],
    "stats": {
      "total_events": 1,
      "matched_events": 1,
      "modis_only_count": 0,
      "viirs_only_count": 0,
      "ambiguous_count": 0,
      "spatial_threshold_km": 2.0,
      "temporal_threshold_minutes": 120.0,
      "mean_spatial_distance_km": 0.42,
      "mean_temporal_difference_minutes": 1.0,
      "average_match_score": 0.939,
      "unfiltered_total_events": 1
    },
    "is_live": true,
    "data_source": "NASA_FIRMS_LIVE",
    "fetched_at": "2026-11-14T06:45:00.000Z",
    "algorithm_version": "AgniNet-Harmonize-v1.1.1",
    "applied_thresholds": {
      "spatial_threshold_km": 2.0,
      "temporal_threshold_minutes": 120.0
    }
  }
  ```

### 2.2 `/api/harmonization/stats`
- **Method:** `GET`
- **Purpose:** High-efficiency statistical roll-up for KPI dashboards without event payload transfer.
- **Response Schema:** `HarmonizationStats`

### 2.3 `/api/harmonization/observations`
- **Method:** `GET`
- **Purpose:** Dual-view endpoint returning categorized unified events alongside observation-to-event partition mappings (`matched_observation_ids`, `modis_only_observation_ids`, `viirs_only_observation_ids`, `ambiguous_observation_ids`).

---

## 3. Data Integrity & Provenance Rules

Phase 4 analytics modules MUST adhere strictly to the following frozen data invariants:

1. **Fire Radiative Power (FRP) Rules:**
   - **NEVER** add, average, or combine `modis_frp_mw` and `viirs_total_frp_mw`. They measure radiant energy across different spectral channels ($4.0\,\mu\text{m}$ vs $3.74/4.05\,\mu\text{m}$) and dissimilar spatial resolutions.
   - For regional energy analytics, report MODIS FRP sums and VIIRS FRP sums separately.
   - If `viirs_total_frp_mw` is null (due to multi-pass or multi-satellite uncertainty), use `viirs_individual_frps` for distribution analysis rather than treating the observation as zero.
2. **Deterministic Identifiers:**
   - Event IDs adhere to the frozen pattern:
     `AGNI-EVT-{YYYYMMDD}-{LAT}{N/S}_{LON}{E/W}-{HEX8}`
   - Generated from SHA-256 hash of sorted source IDs and representative coordinates. Invariant across repeated runs and arbitrary input orderings.
3. **Temporal Invariants:**
   - All dates are ISO calendar dates (`YYYY-MM-DD`).
   - All times are 24-hour UTC times (`HH:MM`).
   - Missing timestamps are preserved as `None` (null) and never fabricated.
4. **Classification Semantics:**
   - `MATCHED`: Validated dual-instrument confirmation.
   - `MODIS_ONLY`: Coarse-resolution observation without high-resolution counterpart.
   - `VIIRS_ONLY`: High-resolution detection without coarse-resolution counterpart (typically low-intensity sub-pixel fires $< 10\text{ MW}$).
   - `AMBIGUOUS`: Competing candidate footprints, chained complexes, or temporal uncertainty.

---

## 4. Phase 4 Historical Architecture Recommendations

For implementing Phase 4 (Historical Trends & Analytics):

1. **Partitioned Historical Buffering:**
   - FIRMS NRT provides rolling 1 to 10-day lookback buffers. For multi-month or multi-year analysis, Phase 4 should introduce an archival SQLite or Parquet cache indexed by `(acquisition_date, geohash_5)`.
2. **Temporal Aggregation Baseline:**
   - Daily/weekly/monthly fire occurrence trends should aggregate by event centroid rather than unharmonized raw detections to prevent double-counting coincident MODIS and VIIRS passes.
3. **Divergence Trend Tracking:**
   - Track the ratio of `MATCHED` to `VIIRS_ONLY` events over time. A rising proportion of `VIIRS_ONLY` detections often indicates smaller, lower-intensity smoldering or early-stage ignitions detectable only by 375m imagery.
4. **Integration Checklist for Phase 4:**
   - [x] Frozen backend harmonization engine (`AgniNet-Harmonize-v1.1.1`).
   - [x] Zero duplicate observation assignment verified.
   - [x] 100% candidate recall on spatial index.
   - [x] Pass-identity FRP aggregation rule established.
   - [x] API schemas typed in TypeScript and Python Pydantic.
   - [x] Full test suite (62/62 passing).
