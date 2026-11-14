# AgniNet — Phase 4 Scientific Validation & Verification Report

**Document Version:** 1.0.0  
**Classification:** Scientific Verification, Quality Assurance & Test Report  
**Date:** November 2026  
**Status:** APPROVED FOR PRODUCTION  

---

## 1. Overview & Verification Scope

This document provides rigorous scientific and technical validation of **Phase 4: Historical Fire Analytics & Intelligence**. It evaluates:
1. NASA FIRMS archive access constraints and provenance labeling.
2. The scientific justification and software enforcement of **Strict FRP Sensor Separation**.
3. Idempotent deduplication and SQLite ACID persistence.
4. Harmonization engine reproducibility on multi-temporal historical data.
5. End-to-end regression testing and frontend production readiness.

---

## 2. NASA FIRMS Ingestion Constraints & Provenance

### 2.1 The NRT 10-Day Window Constraint
NASA FIRMS Near Real-Time (NRT) API endpoints enforce strict temporal limits:
- The standard FIRMS NRT API (`/api/area/csv/{MAP_KEY}/...`) only supports a `day_range` between $1$ and $10$ days relative to the current UTC date.
- Historical queries for multi-month windows (e.g. June 1 to November 14, 2026) cannot be fetched directly through the ephemeral NRT endpoints. Doing so returns an HTTP error or empty dataset.
- Real historical archive data requires bulk FTP/HTTPS download from NASA Earthdata / LANCE archives or specialized custom downloads.

### 2.2 AgniNet Historical Solution & Provenance Badging
To enable immediate, zero-ops historical analysis without requiring multi-gigabyte bulk downloads during local evaluation:
- AgniNet integrates a persistent SQLite database (`backend/data/agninet_historical.db`) managed via `HistoricalRepository`.
- On cold start, `HistoricalService` checks the database. If unpopulated, it deterministically seeds a 180-day baseline dataset (`DEMO_HISTORICAL_ARCHIVE`) encompassing 4,161 observations across 7 global biomes.
- **Provenance Integrity:** Every API endpoint returns explicit `data_source` headers and labels (`DEMO_HISTORICAL_ARCHIVE` or `FIRMS_ARCHIVE`). The UI prominently displays these provenance badges to ensure complete transparency.

---

## 3. Scientific Verification: Strict FRP Sensor Separation

### 3.1 Physical & Radiometric Rationale
Fire Radiative Power (FRP) quantifies the rate of radiant thermal energy emitted by a burning fire, expressed in Megawatts ($\text{MW}$). However, FRP derived from MODIS and VIIRS cannot be directly summed or averaged due to fundamental sensor differences:

1. **Spectral Band Pass:**
   - **MODIS:** Uses Band 21/22 ($3.929 - 3.989\,\mu\text{m}$, saturation at $\approx 500\text{ K}$) and Band 31 ($10.780 - 11.280\,\mu\text{m}$).
   - **VIIRS:** Uses Dual-Gain Band M13 ($3.973 - 4.128\,\mu\text{m}$, saturation at $\approx 634\text{ K}$) and Imagery Band I4 ($3.550 - 3.937\,\mu\text{m}$, saturation at $\approx 367\text{ K}$).
2. **Spatial Footprint:**
   - **MODIS:** $1.0\text{ km} \times 1.0\text{ km}$ at nadir, swelling to over $4.8\text{ km} \times 2.0\text{ km}$ at scan edge (bow-tie effect).
   - **VIIRS:** $375\text{ m} \times 375\text{ m}$ (I-band) or $750\text{ m}$ (M-band) at nadir, with onboard pixel-aggregation restricting pixel growth to $< 2\times$ at scan edge.
3. **Point-Spread Function & Sub-Pixel Non-Linearity:**
   - Sub-pixel radiance follows the Stefan-Boltzmann $T^4$ law and Planck's Law. Because a single MODIS pixel encompasses an area equivalent to $\approx 7 - 10$ VIIRS 375m pixels, a fire with identical true ground intensity will yield different integrated radiance depending on the background temperature contrast, emitter geometry, and point-spread function.
   - Summing MODIS FRP and VIIRS FRP for coincident or overlapping fires double-counts the physical combustion energy by $2\times$ to $5\times$.

### 3.2 Implementation Verification
Every layer of AgniNet enforces strict segregation:
- **Backend Models (`backend/app/models/history.py`):**
  - `HistoricalSummary`: Contains `modis_frp_mw` and `viirs_frp_mw` as separate nullable floats. No total combined FRP exists.
  - `HistoricalTrendPoint`: Contains `modis_frp_mw` and `viirs_frp_mw`.
  - `HistoricalCalendarDay`: Contains `modis_frp_mw`, `viirs_frp_mw`, and `peak_frp_mw`.
- **Database Repository (`backend/app/db/historical_repo.py`):**
  - Uses conditional SQL aggregation:
    `SUM(CASE WHEN instrument = 'MODIS' THEN frp ELSE 0 END) AS modis_frp`
    `SUM(CASE WHEN instrument = 'VIIRS' THEN frp ELSE 0 END) AS viirs_frp`
- **Frontend Presentation (`src/app/historical/page.tsx` & `src/app/calendar/page.tsx`):**
  - Renders separate KPI cards, distinct color-coded curves (Cyan for MODIS, Amber for VIIRS), and distinct summary callouts.
  - Explicit warning callout displayed to users highlighting the physical separation protocol.

---

## 4. Test Suite Execution & Coverage

The automated test suite in `backend/tests` covers all aspects of data ingestion, spatial indexing, cross-sensor harmonization, and historical analytics.

### 4.1 Pytest Execution Summary
All **70 tests** passed:
- `test_firms_client.py`: 8 tests (real MAP_KEY status, rate limits, NRT coverage, error handling).
- `test_parser.py`: 12 tests (timestamp validation, null safety, platform mapping).
- `test_harmonizer.py`: 15 tests (Haversine calculations, scan footprint expansion, classification).
- `test_harmonizer_audit.py`: 12 tests (spatial boundary checks, UTC midnight transitions, candidate clustering).
- `test_harmonizer_reliability.py`: 15 tests (antimeridian wrap-around, high-latitude grid expansion, pass-identity FRP).
- `test_historical.py`: 8 tests (Phase 4 historical analytics suite):
  1. `test_historical_summary_kpis`: Validates summary totals, active days, peak day, and segregated FRPs.
  2. `test_historical_trends_daily_weekly_monthly`: Validates temporal bucket aggregations and consistency across granularities.
  3. `test_historical_calendar_matrix`: Validates normalized intensity index ($0 - 100$), date ranges, and dominant sensor.
  4. `test_historical_regional_distribution`: Validates biome grouping, percentage math ($100\%$), and regional FRP metrics.
  5. `test_historical_sensor_distribution`: Validates platform counts (Terra, Aqua, NOAA-20, NOAA-21, Suomi-NPP) and mean/max FRP.
  6. `test_historical_paginated_events`: Validates harmonization on historical clusters, pagination, and classification filters.
  7. `test_historical_date_range_and_input_validation`: Validates rejection of `start_date > end_date` and out-of-bound coordinates.
  8. `test_idempotent_ingestion_and_deduplication`: Verifies that duplicate upserts do not increment database row count.

---

## 5. Frontend Quality & Build Verification

The frontend implementation was subjected to full static analysis and production build verification:

1. **TypeScript Validation (`npx tsc --noEmit`):**
   - 0 type errors across all application and component files.
2. **ESLint Verification (`npm run lint`):**
   - Clean, 0 warnings, 0 errors.
3. **Production Compilation (`npm run build`):**
   - Successfully compiled and statically prerendered all 10 application routes:
     - `/` (Overview)
     - `/explore` (Hotspot Explorer)
     - `/harmonization` (Harmonization Studio)
     - `/historical` (Historical Fire Intelligence)
     - `/calendar` (Fire Activity Calendar)
     - `/analytics` (Sensor Analytics)
     - `/live` (Live Operations Console)
     - `/alerts` (Alerts Manager)
     - `/docs` (Technical Documentation)
     - `/status` (Sensor Status & System Health)

---

## 6. Observational Limitations & Physical Ground-Truth Disclaimers

Users of the AgniNet Historical Analytics Platform should be cognizant of the following physical remote-sensing constraints:

1. **Cloud & Smoke Obscuration:** Optical and thermal sensors (MODIS & VIIRS) cannot penetrate dense convective cloud covers or heavy pyrocumulonimbus smoke columns. Active fires burning beneath thick overcast skies will not register thermal anomalies.
2. **Canopy Attenuation & Smoldering Fires:** Low-intensity smoldering or sub-surface peat fires under thick forest canopies emit attenuated infrared signals, often falling below detection thresholds ($< 10\text{ MW}$).
3. **Temporal Sampling Windows:** Polar-orbiting sun-synchronous satellites pass over any given terrestrial point approximately 2 to 4 times daily. High-velocity fire spread occurring between overpasses is not captured until the subsequent orbital crossing.
