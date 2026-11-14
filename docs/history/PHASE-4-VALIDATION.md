# AgniNet — Phase 4, 4.1 & 4.1.1 Scientific Validation & Deployment Audit Report

**Document Version:** 1.2.0  
**Classification:** Scientific Verification, Quality Assurance, Provenance Trust & Deployment Audit  
**Date:** November 2026  
**Status:** APPROVED FOR PRODUCTION  

---

## 1. Overview & Verification Scope

This document provides rigorous scientific and technical validation of **Phase 4, Phase 4.1, and Phase 4.1.1: Historical Fire Analytics, Provenance Trust & Deployment Verification**. It evaluates:
1. Mathematical and physical integrity of the **Sensor-Normalized Comparative Activity Index** (and elimination of cross-sensor FRP addition).
2. Server-authoritative **Provenance Trust & Spoofing Immunity** (overriding client-supplied `is_live=True`).
3. Root-level **Render Blueprint Configuration** (`render.yaml`) for temporary free-tier deployment (`/tmp/agninet_historical.db`).
4. Multi-tier **Data Provenance State Machine** handling empty, demo-only, live-only, and mixed-source archives with explicit `is_synthetic` auditing.
5. **Ingestion Security**: Token-based authentication, cryptographic NASA archive verification, batch throttling (max 1,000 records), and radiometric bounds checks.
6. Automated regression test suite results (76/76 passing).

---

## 2. Scientific Integrity: Sensor-Normalized Comparative Activity Index

### 2.1 The Cross-Sensor FRP Fallacy
In early iterations, total daily thermal output was colloquially computed as $\sum \text{FRP}_{\text{MODIS}} + \sum \text{FRP}_{\text{VIIRS}}$. This was eliminated as physically and mathematically invalid:
- **MODIS ($4.0\,\mu\text{m}$, $1.0\text{ km}$ at nadir):** Yields large area-integrated radiative flux heavily blurred at scan edges ($>4.8\text{ km}$).
- **VIIRS ($3.74/4.05\,\mu\text{m}$, $375\text{ m}$ at nadir):** Isolates sub-pixel detections down to $<10\text{ MW}$ that fall below MODIS detection limits.
- **Physical Incompatibility:** Due to Planck's Law and non-linear sub-pixel emitter temperature distributions, adding Megawatts derived from different instruments produces a meaningless hybrid quantity that double-counts physical combustion energy.

### 2.2 Comparative Activity Index Formula & Period Dependency
The fire calendar computes a **sensor-normalized comparative activity index** ($0 - 100$):

$$\hat{M}_d = \begin{cases} \frac{M_d}{M_{\max}}, & \text{if } M_{\max} > 0 \\ 0.0, & \text{otherwise} \end{cases} \quad (\text{dimensionless, } [0, 1])$$

$$\hat{V}_d = \begin{cases} \frac{V_d}{V_{\max}}, & \text{if } V_{\max} > 0 \\ 0.0, & \text{otherwise} \end{cases} \quad (\text{dimensionless, } [0, 1])$$

Where $M_d$ and $V_d$ are cumulative daily MODIS and VIIRS FRP, and $M_{\max}, V_{\max}$ are the maximum single-day outputs observed across the selected query window.

The daily composite dimensionless activity ratio $S_d$ is:
$$S_d = \begin{cases} 
\frac{\hat{M}_d + \hat{V}_d}{2}, & \text{if } M_d > 0 \text{ and } V_d > 0 \\
\hat{M}_d, & \text{if } M_d > 0 \text{ and } V_d = 0 \\
\hat{V}_d, & \text{if } V_d > 0 \text{ and } M_d = 0 \\
0.0, & \text{if } M_d = 0 \text{ and } V_d = 0
\end{cases}$$

$$\text{intensity\_index}_d = \min(100, \text{round}(100 \times S_d))$$

**Scientific Terminology Requirements:**
1. The index is explicitly described as a **relative comparative indicator** scaled to the selected observation period.
2. It does **not** represent absolute physical fire severity or combined energy.
3. Separate MODIS and VIIRS FRP values are preserved in full precision on every calendar day and summary response.

---

## 3. Provenance Trust & Spoofing Immunity

### 3.1 Server-Authoritative Trust Model
Under Phase 4.1.1, client-supplied `is_live=True` is **never** accepted as proof of NASA origin:
- Non-NASA workflows (`ingestion_source` set to `MANUAL`, `COMMUNITY`, or `SYNTHETIC`) are strictly overridden to `is_live=False`.
- Only requests authenticated with `X-NASA-Archive-Token` matching `NASA_ARCHIVE_INGESTION_KEY` and declared as `VERIFIED_NASA_ARCHIVE` can persist records with `is_live=True`.
- Non-NASA ingestions attempting to declare NASA live provenance strings are rejected with **HTTP 422**.
- Audit trails are permanently preserved in `raw_fields_json` documenting client-supplied flags and server override decisions.

### 3.2 Automated Test Proof
In `test_provenance_spoofing_prevention()`:
1. Submitting `is_live: true` with `ingestion_source: "MANUAL"` results in `record.is_live is False` stored in the database with audit note `"is_live forced to False"`.
2. Submitting `VERIFIED_NASA_ARCHIVE` without valid token returns **HTTP 403 Forbidden**.
3. Submitting `NASA_FIRMS_LIVE` provenance on a manual import returns **HTTP 422 Unprocessable Entity**.
4. Authenticated NASA archive import with valid token successfully persists `is_live: true`.

---

## 4. Render Temporary Free-Tier Deployment Configuration

### 4.1 Ephemeral Container Storage Notice
Render free tier does not support persistent disks (`disk:` blocks). Under this temporary free-tier deployment:
- SQLite database storage is configured at `DATABASE_PATH=/tmp/agninet_historical.db`.
- **Data Persistence Disclaimer:** Storage in `/tmp` is temporary and ephemeral. The container filesystem is wiped whenever the instance spins down due to inactivity (after 15 minutes on the free tier), restarts, or redeploys.
- **Cold-Start Auto-Seeding:** On cold boot, AgniNet detects an empty database and automatically re-seeds the 180-day baseline historical dataset (`DEMO_HISTORICAL_ARCHIVE`), ensuring analytics dashboards and visualizations remain functional.

### 4.2 Blueprint Specification (`render.yaml`)
A valid Render Blueprint is configured at the repository root:
- Provisions `agninet-api` (Python Web Service) on the `free` plan without persistent disk declarations.
- Configures `DATABASE_PATH=/tmp/agninet_historical.db`.
- Preserves `ENVIRONMENT=production`.
- Declares secrets using Render-generated random values (`generateValue: true`) for `INGESTION_API_KEY` and `NASA_ARCHIVE_INGESTION_KEY`.
- Sets `NASA_FIRMS_MAP_KEY` as `sync: false` for secure manual dashboard configuration.
- Does not declare `DATABASE_URL`.
- Provisions `agninet-web` (Node.js Next.js Web Service) on the `free` plan referencing `agninet-api` host.

---

## 5. Verification Suite Execution Results

All automated verification checks executed cleanly:

| Verification Stage | Command / Harness | Result | Notes |
|:---|:---|:---|:---|
| **Backend Unit & Integration Tests** | `pytest backend/tests` | **76 passed, 0 failed** | 100% test pass rate across 10 modules |
| **TypeScript Validation** | `npx tsc --noEmit` | **0 errors** | Strict mode validated across all models & components |
| **Frontend Code Quality** | `npm run lint` | **0 errors, 0 warnings** | ESLint verified clean |
| **Production Build** | `npm run build` | **Successfully compiled** | All 10 routes prerendered with Turbopack |

---

## 6. Deployment Limitations & Disclaimer

1. **Deployment Execution Disclaimer:** The repository contains a validated `render.yaml` blueprint ready for deployment. However, automated agent tools do not deploy directly to live external Render accounts without user authorization and manual dashboard credential binding (`NASA_FIRMS_MAP_KEY`).
2. **Satellite Temporal Sampling:** Polar sun-synchronous satellites (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21) provide 2 to 4 overpasses daily. Activity occurring between overpasses is not recorded until subsequent orbital passes.
3. **Smoke & Cloud Obscuration:** Heavy pyrocumulonimbus cloud or dense convective cloud covers attenuate infrared radiance, creating potential observation gaps during severe storm events.
