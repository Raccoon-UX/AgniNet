# AgniNet — Phase 4, 4.1 & 4.1.1 Historical Analytics Architecture

**Document Version:** 1.2.0  
**Status:** IMPLEMENTED, SECURITY AUDITED & PRODUCTION HARDENED  
**Classification:** Core System Architecture, Persistence, Provenance & Deployment Specification  
**Date:** November 2026  

---

## 1. Executive Summary

Phase 4 through Phase 4.1.1 establish a production-grade, scientifically hardened historical fire analytics and temporal intelligence platform for AgniNet. Built atop the frozen Phase 3.1.1 cross-sensor harmonization engine (`AgniNet-Harmonize-v1.1.1`), the system provides multi-temporal archive ingestion, activity trends across multiple time bins, a sensor-normalized comparative fire activity calendar, regional fire regime rollups, and paginated event browsing.

Phase 4.1.1 reinforces provenance trust and deployment verification:
1. **Server-Authoritative Provenance:** Never trusts client-supplied `is_live=True`. Strictly separates verified NASA archive ingestion from manual, community, and demo ingestion workflows. Overrides conflicting client flags and preserves auditable source metadata per observation.
2. **Production Render Blueprint:** Root-level `render.yaml` declares services for the FastAPI backend and Next.js frontend, persistent disk mounts (`/var/data`), and Render-managed secret generation (`generateValue: true`).
3. **Comparative Activity Index:** Consistently defines the calendar metric as a **sensor-normalized comparative activity index** relative to the query window, avoiding false equivalences with absolute physical energy or cross-sensor combined FRP.

---

## 2. Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Presentation Tier (Next.js)                 │
│  - /historical: Multi-tab interactive dashboard (Trends, Biomes, FRP)  │
│  - /calendar: Sensor-normalized comparative activity calendar matrix   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  API & Routing Tier (FastAPI Routers)                  │
│  - backend/app/routers/history.py (7 REST Endpoints)                   │
│  - Auth: verify_ingestion_auth (X-Ingestion-Key / Bearer)              │
│  - NASA Auth: verify_nasa_archive_auth (X-NASA-Archive-Token)          │
│  - Provenance: Server-authoritative is_live override & validation      │
│  - Validation: ISO dates, Bounding Box constraints, batch throttling   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Python Domain Calls
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Domain Services & Analytics Tier                    │
│  - backend/app/services/historical_service.py                          │
│    - Provenance State Machine (_determine_provenance)                  │
│    - Dimensionless Sensor-Normalized Comparative Activity Index        │
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

## 3. Storage Layer & Render Deployment Blueprint

### 3.1 Choice of Persistent Store & Concurrency
- **Engine:** SQLite 3 in WAL (`Write-Ahead Logging`) mode with `synchronous = NORMAL`.
- **ACID Transactions:** Ensures atomicity during batch upsert operations.
- **Portability:** Encapsulated behind `HistoricalRepository`, facilitating clean future migration to PostgreSQL/PostGIS.
- **Version Control Safety:** SQLite files are strictly excluded from git tracking via `.gitignore`.

### 3.2 Render Blueprint Configuration (`render.yaml`)
To prevent data loss in containerized ephemeral environments, persistent disk storage is explicitly declared:

```yaml
services:
  # AgniNet FastAPI Backend Service
  - type: web
    name: agninet-api
    env: python
    plan: starter  # Persistent disk requires starter plan or higher on Render
    buildCommand: pip install -r backend/requirements.txt
    startCommand: uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT
    disk:
      name: agninet-data
      mountPath: /var/data
      sizeGB: 1
    envVars:
      - key: DATABASE_PATH
        value: /var/data/agninet_historical.db
      - key: ENVIRONMENT
        value: production
      - key: INGESTION_API_KEY
        generateValue: true
      - key: NASA_ARCHIVE_INGESTION_KEY
        generateValue: true
      - key: NASA_FIRMS_MAP_KEY
        sync: false  # Must be manually entered in Render Dashboard under Environment

  # AgniNet Next.js Frontend Service
  - type: web
    name: agninet-web
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NEXT_PUBLIC_API_URL
        fromService:
          type: web
          name: agninet-api
          property: host
```

### 3.3 Manual Dashboard Setup
1. **NASA FIRMS MAP KEY:** Set `NASA_FIRMS_MAP_KEY` in the Render Dashboard under `agninet-api` -> Environment.
2. **Persistent Disk Attachment:** Render Starter plan provisions the `/var/data` disk automatically from the blueprint.
3. **Directory Guarantee:** `init_db()` ensures `os.makedirs(os.path.dirname(target_path), exist_ok=True)` runs before establishing SQLite connections.

---

## 4. Server-Authoritative Provenance & Ingestion Security

### 4.1 Provenance Spoofing Prevention Protocol
Client payloads can NEVER self-certify as live NASA telemetry:
1. **Source Separation:** `ingestion_source` categorizes workflows into `MANUAL`, `COMMUNITY`, `SYNTHETIC`, or `VERIFIED_NASA_ARCHIVE`.
2. **Cryptographic NASA Verification:** `VERIFIED_NASA_ARCHIVE` requires `X-NASA-Archive-Token` matching `NASA_ARCHIVE_INGESTION_KEY`. Requests lacking this token return **HTTP 403 Forbidden**.
3. **Client `is_live` Override:** For all non-NASA ingestions, the server forcefully overrides `is_live = False`, even if the client explicitly submitted `is_live: true`.
4. **Audit Metadata Preservation:** The client's original claim and the server's override action are permanently preserved in the observation's `raw_fields_json`:
   ```json
   {
     "client_supplied_is_live": true,
     "server_provenance_enforced": "is_live forced to False: manual/external ingestion source",
     "ingestion_source": "MANUAL"
   }
   ```
5. **Conflicting Provenance Rejection:** Non-NASA ingestions claiming NASA live strings in `provenance` are rejected with **HTTP 422 Unprocessable Entity**.

### 4.2 Ingestion Throttling & Validation Bounds
- Protected by `X-Ingestion-Key` / Bearer token via `secrets.compare_digest()`.
- Maximum batch size: 1,000 observations per request (`MAX_INGESTION_BATCH_SIZE`).
- Physical bounds: Latitude in $[-90, 90]$, Longitude in $[-180, 180]$, FRP $\ge 0$, Brightness in $[100, 600]\text{ K}$, valid calendar dates, and 24-hour UTC times.

---

## 5. Provenance Classification State Machine

Every historical query passes through `HistoricalService._determine_provenance()`, which tags responses into 4 distinct categories:

| Dataset Membership | `data_source` | `is_live` | `is_synthetic` | Provenance Label |
|:---|:---|:---|:---|:---|
| **Empty** | `EMPTY_ARCHIVE` | `false` | `false` | `AgniNet-Historical-Pipeline-v1.1 (Empty Store)` |
| **Pure Live** | `NASA_FIRMS_LIVE_ARCHIVE` | `true` | `false` | `NASA_FIRMS_ARCHIVE (Authenticated Telemetry Archive, N records)` |
| **Pure Demo** | `DEMO_HISTORICAL_ARCHIVE` | `false` | `true` | `DEMO_HISTORICAL_ARCHIVE (100% Modeled Synthetic Fixtures, N records)` |
| **Mixed** | `MIXED_HISTORICAL_ARCHIVE` | `false` | `true` | `MIXED_ARCHIVE (N Live NASA Observations, M Synthetic Fixtures)` |

---

## 6. Scientific Methodology: Comparative Activity Index

To eliminate the physical fallacy of cross-sensor FRP addition ($M_{\text{FRP}} + V_{\text{FRP}}$), the fire calendar implements a **sensor-normalized comparative activity index**:

1. **Relative Scaling:** Each instrument's daily radiative output ($M_d$ and $V_d$) is scaled against its own maximum single-day output within the selected query window ($M_{\max}$ and $V_{\max}$).
2. **Dimensionless Ratio:** $\hat{M}_d = M_d / M_{\max} \in [0, 1]$ and $\hat{V}_d = V_d / V_{\max} \in [0, 1]$.
3. **Composite Index:** $S_d = (\hat{M}_d + \hat{V}_d) / 2.0$, scaled to integer $\text{intensity\_index}_d = \min(100, \text{round}(100 \times S_d))$.
4. **Caveat:** The index is explicitly documented as a relative comparative indicator tied to the selected query window; it does **not** quantify absolute physical energy or cross-sensor combined FRP. Separate MODIS and VIIRS FRP values are preserved in full precision.
