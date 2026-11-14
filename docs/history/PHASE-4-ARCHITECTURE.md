# AgniNet — Phase 4 Historical Fire Analytics Architecture

**Document Version:** 1.0.0  
**Status:** IMPLEMENTED & PRODUCTION READY  
**Classification:** Core System Architecture & Data Pipeline  
**Date:** November 2026  

---

## 1. Executive Summary

Phase 4 introduces persistent historical active-fire analytics and temporal intelligence to the AgniNet platform. Built atop the validated Phase 2 ingestion pipeline and frozen Phase 3.1.1 cross-sensor harmonization engine (`AgniNet-Harmonize-v1.1.1`), Phase 4 delivers multi-month and multi-year fire regime analysis, daily/weekly/monthly activity trends, calendar thermal intensity indices, regional biome comparisons, and spacecraft constellation breakdowns.

A primary architectural mandate of Phase 4 is **scientific integrity**: observational data from distinct sensor platforms (MODIS Terra/Aqua at 1 km resolution and VIIRS Suomi-NPP/NOAA-20/NOAA-21 at 375 m resolution) are persisted with high fidelity and analyzed with strict physical separation of Fire Radiative Power (FRP).

---

## 2. Architectural Overview

The Phase 4 architecture follows a clean 4-tier domain-driven design:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Presentation Tier (Next.js)                 │
│  - /historical: Multi-tab interactive dashboard (Trends, Biomes, FRP)  │
│  - /calendar: Normalized thermal severity calendar heatmap matrix      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
┌───────────────────────────────────▼────────────────────────────────────┐
│                  API & Routing Tier (FastAPI Routers)                  │
│  - backend/app/routers/history.py (7 REST Endpoints)                   │
│  - Query parameter validation, ISO dates, Bounding Box constraints     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Python Domain Calls
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Domain Services & Analytics Tier                    │
│  - backend/app/services/historical_service.py                          │
│    - Query orchestration, temporal binning (day/week/month)            │
│    - HarmonizationEngine invocation (AgniNet-Harmonize-v1.1.1)         │
│    - Biome spatial bounding box classification                         │
│    - Calendar intensity index normalization (0 - 100)                  │
│  - backend/app/services/historical_fixtures.py (180-day baseline)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL Queries (WAL Mode)
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Storage & Repository Tier (SQLite)                   │
│  - backend/app/db/historical_repo.py (HistoricalRepository)            │
│  - backend/app/db/database.py (DatabaseManager, connection pool)       │
│  - Data Store: backend/data/agninet_historical.db                      │
│  - Secondary B-tree indexes on date, region, sensor, and coordinates   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Storage Layer & Persistence Strategy

### 3.1 Choice of Persistent Store
For the single-instance deployment and local development runtime, **SQLite** was chosen for persistence rather than an in-memory dictionary or external database cluster:
- **Zero Ops Overhead:** No external daemon or network dependency required.
- **ACID Compliance & Concurrency:** Configured with `WAL` (Write-Ahead Logging) mode, enabling concurrent non-blocking reads while handling batch write transactions.
- **Portability:** Self-contained database file located at `backend/data/agninet_historical.db`, excluded from git tracking via `.gitignore`.
- **PostGIS Migration Readiness:** The repository layer (`HistoricalRepository`) encapsulates all SQL dialect specifics, ensuring clean migration to PostgreSQL/PostGIS in future multi-node deployments.

### 3.2 Database Schema
The schema is automatically initialized on application startup via `DatabaseManager`:

```sql
CREATE TABLE IF NOT EXISTS historical_observations (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    brightness REAL,
    scan REAL,
    track REAL,
    acq_date TEXT NOT NULL,
    acq_time TEXT,
    satellite TEXT NOT NULL,
    instrument TEXT NOT NULL,
    confidence TEXT,
    version TEXT,
    bright_t31 REAL,
    frp REAL,
    daynight TEXT,
    region TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hist_obs_date ON historical_observations (acq_date);
CREATE INDEX IF NOT EXISTS idx_hist_obs_region ON historical_observations (region);
CREATE INDEX IF NOT EXISTS idx_hist_obs_sensor ON historical_observations (instrument, satellite);
CREATE INDEX IF NOT EXISTS idx_hist_obs_geo ON historical_observations (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hist_obs_frp ON historical_observations (frp);

CREATE TABLE IF NOT EXISTS ingestion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    batch_size INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 3.3 Idempotent Ingestion & Deduplication
To prevent duplicate records when re-ingesting overlapping historical archives or running batch loads, the ingestion pipeline implements idempotent upserts:
```sql
INSERT INTO historical_observations (
    id, source, latitude, longitude, brightness, scan, track,
    acq_date, acq_time, satellite, instrument, confidence,
    version, bright_t31, frp, daynight, region
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    brightness = excluded.brightness,
    confidence = excluded.confidence,
    frp = excluded.frp,
    region = excluded.region;
```
Observation IDs adhere to deterministic naming conventions:
- Natural upstream ID if unique (e.g. `HIST_MODIS_...`, `HIST_VIIRS_...`), or
- Derived SHA-256 hash of `(source, latitude, longitude, acq_date, acq_time, satellite)`.

---

## 4. Ingestion & Baseline Data Architecture

### 4.1 NASA FIRMS NRT vs. Historical Archive Distinction
- **NASA FIRMS NRT (Near Real-Time):** Exposes rolling 1-to-10 day rolling windows. Queries outside this ephemeral window cannot be fetched via the NRT `MAP_KEY` endpoints.
- **NASA FIRMS Archive:** Requires historical bulk distribution or archive subscription services.
- **AgniNet Baseline Fixtures:** When the persistent database is unpopulated or missing historical depth, `HistoricalService` seeds a deterministic, scientifically modeled 180-day baseline archive (June 1 – November 14, 2026) containing 4,161 observations across 7 global biomes.
- **Provenance Transparency:** Every response payload explicitly carries a `data_source` tag (e.g. `DEMO_HISTORICAL_ARCHIVE` or `FIRMS_ARCHIVE`) and `is_synthetic` flag so client consumers never confuse modeled baselines with live real-time telemetry.

### 4.2 Regional Biome Classification
Incoming observations are spatially classified into key global fire regimes via bounding box intersections:
1. **Amazon Basin** (`[-15.0, -75.0, 5.0, -45.0]`): Tropical rainforest and deforestation frontier.
2. **Northern Australia Savanna** (`[-25.0, 115.0, -10.0, 150.0]`): Savanna and woodland pre-monsoon dry season burning.
3. **California & Pacific NW** (`[32.0, -125.0, 49.0, -114.0]`): Mediterranean chaparral, conifer forest fire regime.
4. **Alberta & Canadian Taiga** (`[50.0, -130.0, 65.0, -110.0]`): Boreal peat and crown forest fires.
5. **Pantanal Wetland** (`[-22.0, -58.0, -16.0, -55.0]`): South American wetland ecosystem.
6. **Mediterranean Basin** (`[35.0, -10.0, 45.0, 40.0]`): S. Europe and N. Africa dry summer fires.
7. **Siberian Boreal** (`[55.0, 80.0, 70.0, 140.0]`): High-latitude Siberian taiga.
8. **Global / Other**: hot spots outside designated focal biomes.

---

## 5. Analytics & Harmonization Pipeline

### 5.1 Event Harmonization on Historical Data
Raw satellite detections often suffer from double counting when Terra, Aqua, NOAA-20, NOAA-21, and Suomi-NPP observe the same burning event. Rather than simply plotting unharmonized hotspot counts, `HistoricalService` dynamically executes `HarmonizationEngine(AgniNet-Harmonize-v1.1.1)` on filtered observation clusters:
- Evaluates spatial distance using exact Haversine formulas with antimeridian wrap-around.
- Evaluates temporal separation across UTC midnight boundaries.
- Produces unified events classified as `MATCHED`, `MODIS_ONLY`, `VIIRS_ONLY`, or `AMBIGUOUS`.
- Prevents double-counting in event trend metrics.

### 5.2 Strict Sensor Separation for Fire Radiative Power (FRP)
A fundamental tenet of AgniNet is that **MODIS FRP (MW) and VIIRS FRP (MW) must NEVER be summed or blended together**:
- MODIS computes FRP from the $4.0\,\mu\text{m}$ mid-infrared band over a $1\text{ km}$ footprint.
- VIIRS computes FRP from the $3.74/4.05\,\mu\text{m}$ dual-gain bands over a $375\text{ m}$ footprint.
- Due to the cubic and quartic temperature dependence of sub-pixel radiance and unequal pixel point-spread functions, summing them is mathematically invalid and physically meaningless.
- **Phase 4 Enforcement:** All API response contracts, repository aggregations, and frontend visualizations maintain strictly segregated fields (`modis_frp_mw` and `viirs_frp_mw`).

---

## 6. Frontend Integration

1. **`/historical` Dashboard (`src/app/historical/page.tsx`):**
   - KPI metrics strip displaying Total Events, Total Hotspots, Dual-Matched confirmation rate, Segregated MODIS FRP, Segregated VIIRS FRP, and Peak Day.
   - 5 dedicated views: Temporal Activity Trends, Radiative Flux (FRP), Regional Biome Comparison, Spacecraft Constellation Breakdown, and Paginated Unified Events.
   - Quick presets (`30D`, `90D`, `SEASON_2026`, `ALL`) and custom date ranges.
2. **`/calendar` Heatmap (`src/app/calendar/page.tsx`):**
   - Normalized daily severity index: $\text{Index} = \min\left(100, \text{round}\left(100 \times \frac{\text{day\_hotspots}}{\max(\text{period\_hotspots})}\right)\right)$.
   - Dynamic cell selection revealing sensor breakdown, dominant platform, and separated FRP.
   - Educational panels for diurnal fire rhythm and hemispheric burning cycles.
