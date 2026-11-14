# AgniNet — Phase 4 & 4.1 Historical Analytics REST API Reference

**Document Version:** 1.1.0  
**Classification:** REST API Reference & Security Contract  
**Base URL:** `/api/history`  
**Protocol:** HTTP/1.1 JSON (UTF-8)  
**Date:** November 2026  

---

## 1. Overview

The Historical Fire Analytics API provides high-efficiency endpoints for querying persisted fire observations, computing temporal activity trends, generating dimensionless severity calendar heatmaps, performing regional biome aggregations, breaking down satellite constellation distributions, and ingesting archive batches securely.

All responses adhere strictly to ISO 8601 timestamps (`YYYY-MM-DD`, `HH:MM`, `YYYY-MM-DDTHH:MM:SSZ`), WGS84 coordinates, and enforce scientific separation of MODIS and VIIRS Fire Radiative Power (FRP).

---

## 2. Global Query Parameters & Validation

The historical read endpoints support the following query filters:

| Parameter | Type | Default | Description | Validation Constraints |
|:---|:---|:---|:---|:---|
| `start_date` | string | `None` | Earliest observation date | Must match `YYYY-MM-DD`. Cannot be after `end_date`. |
| `end_date` | string | `None` | Latest observation date | Must match `YYYY-MM-DD`. Cannot be before `start_date`. |
| `region` | string | `None` | Specific biome or region filter | E.g. `Amazon Basin`, `Northern Australia`, `California`. Case-insensitive match. |
| `sensor` | string | `None` | Filter by sensor type | `MODIS` or `VIIRS`. Case-insensitive. |
| `min_lat` | float | `None` | Southern bounding box limit | $-90.0 \le \text{min\_lat} \le 90.0$. Must be $\le \text{max\_lat}$. |
| `max_lat` | float | `None` | Northern bounding box limit | $-90.0 \le \text{max\_lat} \le 90.0$. Must be $\ge \text{min\_lat}$. |
| `min_lon` | float | `None` | Western bounding box limit | $-180.0 \le \text{min\_lon} \le 180.0$. |
| `max_lon` | float | `None` | Eastern bounding box limit | $-180.0 \le \text{max\_lon} \le 180.0$. |

### HTTP 400 Bad Request
If `start_date > end_date` or bounding box coordinates violate geographic bounds, the API returns a structured HTTP 400 error:
```json
{
  "detail": "Invalid date range: start_date '2026-10-01' cannot be after end_date '2026-09-01'."
}
```

---

## 3. Endpoints

### 3.1 `GET /api/history/summary`
Retrieves top-level historical KPI metrics across the requested temporal and spatial filter window.

#### Response Schema (`HistoricalSummary`)
```json
{
  "total_events": 2845,
  "total_observations": 4161,
  "matched_events": 854,
  "modis_only_events": 412,
  "viirs_only_events": 1560,
  "ambiguous_events": 19,
  "modis_frp_gigawatts": 34.82,
  "viirs_frp_gigawatts": 89.45,
  "average_match_score": 0.884,
  "peak_day": "2026-09-12",
  "peak_day_events": 88,
  "date_range_start": "2026-06-01",
  "date_range_end": "2026-11-14",
  "active_platforms": ["Aqua", "NOAA-20", "NOAA-21", "Suomi-NPP", "Terra"],
  "data_source": "DEMO_HISTORICAL_ARCHIVE",
  "is_live": false,
  "is_synthetic": true,
  "provenance": "DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, 4161 records)"
}
```

> **Important:** Notice that `modis_frp_gigawatts` and `viirs_frp_gigawatts` are reported as distinct fields. There is intentionally **no combined total FRP field**.

---

### 3.2 `GET /api/history/trends`
Computes time-series trend buckets aggregated by day, week, or month.

#### Additional Query Parameters
| Parameter | Type | Default | Choices | Description |
|:---|:---|:---|:---|:---|
| `granularity` | string | `day` | `day`, `week`, `month` | Temporal bucket grouping size. |

#### Response Schema (`HistoricalTrendsResponse`)
```json
{
  "granularity": "week",
  "total_buckets": 25,
  "trends": [
    {
      "date_bucket": "2026-W36",
      "event_count": 168,
      "observation_count": 245,
      "matched_count": 54,
      "modis_only_count": 24,
      "viirs_only_count": 88,
      "ambiguous_count": 2,
      "modis_frp_mw": 2980.4,
      "viirs_frp_mw": 6120.8,
      "average_confidence": 88.5
    }
  ],
  "data_source": "DEMO_HISTORICAL_ARCHIVE",
  "is_live": false,
  "is_synthetic": true,
  "provenance": "DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, 4161 records)",
  "fetched_at": "2026-11-14T07:00:00.000Z"
}
```

---

### 3.3 `GET /api/history/calendar`
Generates a complete daily active-fire matrix with normalized dimensionless severity indices.

#### Scientific Normalization Formula
The `intensity_index` ($0 - 100$) is computed strictly via dimensionless scaling against each sensor's period maximum:
$$\hat{M}_d = \frac{M_d}{M_{\max}}, \quad \hat{V}_d = \frac{V_d}{V_{\max}}, \quad S_d = \frac{\hat{M}_d + \hat{V}_d}{2}$$
At no point are MODIS and VIIRS Megawatts added together.

#### Response Schema (`HistoricalCalendarResponse`)
```json
{
  "days": [
    {
      "date": "2026-09-12",
      "event_count": 62,
      "observation_count": 88,
      "intensity_index": 100,
      "dominant_sensor": "VIIRS",
      "modis_count": 28,
      "viirs_count": 60,
      "modis_frp_mw": 1140.2,
      "viirs_frp_mw": 2450.6,
      "peak_frp_mw": 482.0
    }
  ],
  "total_days": 92,
  "max_daily_events": 62,
  "max_daily_modis_frp_mw": 1140.2,
  "max_daily_viirs_frp_mw": 2450.6,
  "peak_single_frp_mw": 482.0,
  "date_range_start": "2026-08-15",
  "date_range_end": "2026-11-14",
  "data_source": "DEMO_HISTORICAL_ARCHIVE",
  "is_live": false,
  "is_synthetic": true,
  "provenance": "DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, 4161 records)",
  "fetched_at": "2026-11-14T07:00:00.000Z"
}
```

---

### 3.4 `GET /api/history/regions`
Aggregates activity by geographical biomes and fire regimes.

#### Response Schema (`HistoricalRegionsResponse`)
```json
{
  "regions": [
    {
      "region_name": "Amazon Basin",
      "event_count": 875,
      "observation_count": 1280,
      "matched_count": 280,
      "modis_frp_mw": 14200.5,
      "viirs_frp_mw": 32100.8,
      "percentage_of_total": 30.76
    }
  ],
  "total_events": 2845,
  "data_source": "DEMO_HISTORICAL_ARCHIVE",
  "is_live": false,
  "is_synthetic": true,
  "provenance": "DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, 4161 records)",
  "fetched_at": "2026-11-14T07:00:00.000Z"
}
```

---

### 3.5 `GET /api/history/sensors`
Provides a breakdown across satellite platforms and sensor instruments (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21).

#### Response Schema (`HistoricalSensorsResponse`)
```json
{
  "sensors": [
    {
      "satellite": "NOAA-20",
      "instrument": "VIIRS",
      "sensor_source": "VIIRS_NOAA20_NRT",
      "observation_count": 1410,
      "share_percentage": 33.89,
      "daytime_count": 846,
      "nighttime_count": 564,
      "total_frp_mw": 34968.0,
      "mean_frp_mw": 24.8,
      "max_frp_mw": 482.0,
      "average_confidence": 88.5
    }
  ],
  "total_observations": 4161,
  "modis_observation_count": 1240,
  "viirs_observation_count": 2921,
  "data_source": "DEMO_HISTORICAL_ARCHIVE",
  "is_live": false,
  "is_synthetic": true,
  "provenance": "DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, 4161 records)",
  "fetched_at": "2026-11-14T07:00:00.000Z"
}
```

---

### 3.6 `GET /api/history/events`
Returns paginated, cross-sensor unified events derived from historical observations using `AgniNet-Harmonize-v1.1.1`.

#### Additional Query Parameters
| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `classification` | string | `None` | `MATCHED`, `MODIS_ONLY`, `VIIRS_ONLY`, `AMBIGUOUS`. |
| `page` | integer | `1` | Page number ($\ge 1$). |
| `page_size` | integer | `25` | Records per page ($1 \le \text{page\_size} \le 200$). |

#### Response Schema (`HistoricalEventsResponse`)
```json
{
  "events": [
    {
      "id": "AGNI-EVT-20260912-10.42S_54.12W-f8e2a10b",
      "classification": "MATCHED",
      "latitude": -10.421,
      "longitude": -54.123,
      "acquisition_date": "2026-09-12",
      "earliest_acq_utc": "17:15",
      "latest_acq_utc": "17:18",
      "modis_observation_ids": ["HIST_MODIS_..."],
      "viirs_observation_ids": ["HIST_VIIRS_..."],
      "modis_satellites": ["Aqua"],
      "viirs_satellites": ["NOAA-20"],
      "modis_frp_mw": 84.5,
      "viirs_total_frp_mw": 98.2,
      "spatial_distance_km": 0.412,
      "temporal_difference_minutes": 3.0,
      "match_score": 0.941,
      "algorithm_version": "AgniNet-Harmonize-v1.1.1"
    }
  ],
  "total_events": 854,
  "page": 1,
  "page_size": 25,
  "total_pages": 35,
  "data_source": "DEMO_HISTORICAL_ARCHIVE",
  "is_live": false,
  "is_synthetic": true,
  "provenance": "DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, 4161 records)",
  "fetched_at": "2026-11-14T07:00:00.000Z"
}
```

---

### 3.7 `POST /api/history/ingest`
Protected endpoint for idempotently inserting or updating historical observations in the persistent database.

#### Security & Headers
| Header | Required | Description |
|:---|:---|:---|
| `X-Ingestion-Key` | Yes | Token matching server `INGESTION_API_KEY`. |
| `Authorization` | Alternative | `Bearer <token>` format matching `INGESTION_API_KEY`. |

- **HTTP 403 Forbidden:** Returned when `INGESTION_API_KEY` is unset on the server.
- **HTTP 401 Unauthorized:** Returned when credential token is missing or invalid.
- **HTTP 400 Bad Request:** Returned when payload has 0 records or $> 1,000$ records (`MAX_INGESTION_BATCH_SIZE`).
- **HTTP 422 Unprocessable Entity:** Returned when coordinate or date bounds are violated.

#### Request Schema (`HistoricalIngestionRequest`)
```json
{
  "provenance": "NASA_FIRMS_ARCHIVE_BATCH_01",
  "observations": [
    {
      "id": "HIST_OBS_20260901_001",
      "latitude": -12.45,
      "longitude": -55.80,
      "acquisition_date": "2026-09-01",
      "acquisition_time_utc": "17:30",
      "satellite": "Aqua",
      "instrument": "MODIS",
      "sensor_source": "MODIS_NRT",
      "confidence": "85",
      "frp_mw": 45.2,
      "brightness_kelvin": 328.4,
      "scan_angle": 1.1,
      "track_km": 1.0,
      "day_night": "D",
      "region": "Amazon Basin, Brazil"
    }
  ]
}
```

#### Response Schema (`HistoricalIngestionResponse`)
```json
{
  "status": "SUCCESS",
  "records_received": 1,
  "records_inserted": 1,
  "records_updated": 0,
  "timestamp_utc": "2026-11-14T07:25:00.000Z",
  "provenance": "NASA_FIRMS_ARCHIVE_BATCH_01"
}
```
If duplicate IDs are submitted in subsequent requests, records are updated in place with zero duplicate row creation (`records_inserted: 0`, `records_updated: 1`, total database row count unchanged).
