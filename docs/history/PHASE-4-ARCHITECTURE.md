# AgniNet — Phase 4 & 4.1 Historical Fire Analytics Architecture

**Document Version:** 1.1.0  
**Status:** IMPLEMENTED & PRODUCTION HARDENED  
**Classification:** Core System Architecture, Persistence & Security Specification  
**Date:** November 2026  

---

## 1. Executive Summary

Phase 4 & Phase 4.1 establish a production-grade, scientifically hardened historical fire analytics platform for AgniNet. Integrating the frozen Phase 3.1.1 cross-sensor harmonization engine (`AgniNet-Harmonize-v1.1.1`), the system provides multi-temporal archive ingestion, daily/weekly/monthly activity trends, a dimensionless sensor-normalized fire severity calendar, regional fire regime rollups, and paginated event browsing.

Phase 4.1 hardens the platform for production deployment:
1. **Scientific Integrity:** Replaces cross-sensor FRP summation in calendar analytics with a dimensionless, sensor-normalized thermal severity index.
2. **Production Persistence:** Adds configurable database storage via `DATABASE_PATH`, documented Render Persistent Disk architecture (`/var/data`), and automated directory creation for absolute mount paths.
3. **Provenance Integrity:** Implements a strict 4-state provenance classifier (`EMPTY_ARCHIVE`, `DEMO_HISTORICAL_ARCHIVE`, `NASA_FIRMS_LIVE_ARCHIVE`, `MIXED_HISTORICAL_ARCHIVE`) with explicit `is_synthetic` flags.
4. **Ingestion Security:** Protects write operations on `/api/history/ingest` with timing-safe API-key authentication, batch throttling (max 1,000 records), radiometric bounds validation, and secret masking.

---

## 2. Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Presentation Tier (Next.js)                 │
│  - /historical: Multi-tab interactive dashboard (Trends, Biomes, FRP)  │
│  - /calendar: Dimensionless thermal severity calendar heatmap matrix   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  API & Routing Tier (FastAPI Routers)                  │
│  - backend/app/routers/history.py (7 REST Endpoints)                   │
│  - Security: verify_ingestion_auth (X-Ingestion-Key / Bearer)          │
│  - Validation: ISO dates, Bounding Box constraints, batch throttling   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Python Domain Calls
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Domain Services & Analytics Tier                    │
│  - backend/app/services/historical_service.py                          │
│    - Provenance State Machine (_determine_provenance)                  │
│    - Dimensionless Sensor-Normalized Calendar Index (0-100)            │
│    - HarmonizationEngine invocation (AgniNet-Harmonize-v1.1.1)         │
│    - Biome spatial bounding box classification                         │
│  - backend/app/services/historical_fixtures.py (180-day baseline)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL Queries (WAL Mode)
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Storage & Repository Tier (SQLite)                   │
│  - backend/app/db/historical_repo.py (HistoricalRepository)            │
│  - backend/app/db/database.py (DatabaseManager, connection pool)       │
│  - Mount Path: Configured via DATABASE_PATH (e.g. /var/data/...)       │
│  - Secondary B-tree indexes on date, region, sensor, and coordinates   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Storage Layer & Production Deployment Persistence

### 3.1 Choice of Persistent Store & Portability
- **Engine:** SQLite 3 in WAL (`Write-Ahead Logging`) mode with `synchronous = NORMAL`.
- **Concurrency:** Enables non-blocking concurrent reads while handling atomic write batches.
- **Portability:** Database interaction is strictly mediated through `HistoricalRepository`, isolating SQL dialect specifics to simplify future migration to PostgreSQL / PostGIS.
- **Version Control Safety:** SQLite database files (`*.db`, `*.sqlite`, `*.sqlite3`) are strictly ignored via `.gitignore` and are never committed to the repository.

### 3.2 Production Deployment Persistence on Render
> [!WARNING]
> Standard container deployments (Render Web Services, Fly.io, Heroku) run in ephemeral container filesystems. Any database written to the default relative path will be wiped on every redeploy or container restart!

To ensure durable persistence in production:
1. **Provision a Render Persistent Disk:**
   - Disk Name: `agninet-data`
   - Mount Path: `/var/data`
   - Size: Minimum 1 GB
2. **Configure Environment Variables:**
   - `DATABASE_PATH=/var/data/agninet_historical.db`
   - `INGESTION_API_KEY=<random-secret-token>`
3. **Directory Creation Guarantee:**
   When `init_db()` is called on server startup, it calls `os.makedirs(os.path.dirname(target_path), exist_ok=True)`. This automatically creates any missing parent directories (`/var/data`) on an attached mount point before opening the database connection.

---

## 4. Ingestion Security & Bounds Validation

The `/api/history/ingest` endpoint is protected against unauthorized public writes and malformed inputs:

1. **Authentication Layer:**
   - Requires `X-Ingestion-Key` header or `Authorization: Bearer <key>`.
   - Verified via `secrets.compare_digest()` for timing-attack immunity.
   - If `INGESTION_API_KEY` is unset on the server, write access is locked by default (HTTP 403 Forbidden).
   - Missing or invalid credentials return HTTP 401 Unauthorized.
2. **Batch Throttling:**
   - Payloads with $> 1,000$ observations (configurable via `MAX_INGESTION_BATCH_SIZE`) are rejected with HTTP 400 Bad Request.
3. **Radiometric & Geographic Validation:**
   - Latitude: $-90.0 \le \text{lat} \le 90.0$
   - Longitude: $-180.0 \le \text{lon} \le 180.0$
   - FRP: $\ge 0.0\text{ MW}$
   - Brightness: $100.0\text{ K} \le T_b \le 600.0\text{ K}$
   - Acquisition Date: Strict Gregorian calendar validation (rejects invalid dates like Feb 30).
   - Acquisition Time: Strict 24-hour UTC format `00:00` to `23:59`.
4. **Secret Masking:**
   - Exception handlers intercept and sanitize error strings to ensure API keys, internal tokens, or configuration paths are never leaked in HTTP responses or log output.

---

## 5. Provenance Classification Architecture

The `HistoricalService._determine_provenance()` method applies a 4-state classifier to eliminate ambiguity:

```
                  ┌──────────────────────┐
                  │ Evaluate Query Obs   │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     [len(obs) == 0]   [All o.is_live]   [All not is_live]
            │                │                │
            ▼                ▼                ▼
     EMPTY_ARCHIVE    NASA_FIRMS_LIVE   DEMO_HISTORICAL
     (is_live: false  (is_live: true    (is_live: false
      synth: false)    synth: false)     synth: true)
                             │
                             ▼ [Both live & demo present]
                      MIXED_HISTORICAL_ARCHIVE
                      (is_live: false, synth: true)
```

Synthetic fixtures are permanently labeled and will never be represented as authenticated NASA satellite telemetry.

---

## 6. Dimensionless Calendar Normalization Architecture

To eliminate the physical error of summing MODIS and VIIRS FRP across different wavelengths ($4.0\,\mu\text{m}$ vs $3.74/4.05\,\mu\text{m}$) and footprints ($1\text{ km}$ vs $375\text{ m}$), the calendar matrix uses a sensor-normalized dimensionless formula:

1. Calculate period peak daily cumulative output per sensor: $M_{\max}$ and $V_{\max}$.
2. Normalize each day's cumulative output into a dimensionless ratio: $\hat{M}_d = M_d / M_{\max}$ and $\hat{V}_d = V_d / V_{\max}$.
3. Average the active dimensionless ratios: $S_d = (\hat{M}_d + \hat{V}_d) / 2.0$.
4. Scale to integer index: $\text{intensity\_index}_d = \min(100, \text{round}(100 \times S_d))$.
5. Preserve separate $M_d$ and $V_d$ fields in the API payload without cross-sensor addition.
