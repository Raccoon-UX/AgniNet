# AgniNet — Backend Service (FastAPI)

FastAPI microservice providing real-time ingestion, normalization, validation, and caching for **NASA FIRMS (Fire Information for Resource Management System)** satellite active fire observations.

## Features
- **NASA FIRMS Live API Client**: Async HTTP client (`httpx`) with 15s timeout, rate limit handling, and in-memory TTL caching (5 minutes).
- **Supported Sensors**:
  - `MODIS_NRT` / `MODIS_SP` — Terra & Aqua (1000m)
  - `VIIRS_NOAA20_NRT` — NOAA-20 (375m)
  - `VIIRS_NOAA21_NRT` — NOAA-21 (375m)
  - `VIIRS_SNPP_NRT` / `VIIRS_SNPP_SP` — Suomi-NPP (375m)
- **Zero-Credential Demo Fallback**: When `NASA_FIRMS_MAP_KEY` is not configured, the service seamlessly falls back to high-fidelity, clearly marked synthetic demo fixtures so the frontend remains fully operational without crashing.
- **Strict Data Normalization**: Harmonizes MODIS and VIIRS CSV outputs into a unified Pydantic schema while preserving raw instrument channels (`bright_ti4`, `bright_ti5`, `brightness`, `bright_t31`, `scan`, `track`, `confidence`).
- **Security**: The NASA `MAP_KEY` is never exposed or returned to the client browser.

---

## Getting Started

### 1. Create and Activate Virtual Environment
```bash
cd backend
python -m venv .venv

# On Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# On Linux/macOS
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
```
To enable live NASA satellite data:
1. Register for a free NASA FIRMS API key at: [https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)
2. Paste the key into `backend/.env`:
   ```bash
   NASA_FIRMS_MAP_KEY=your_32_char_firms_key_here
   ```
*(If left empty, AgniNet defaults to demo fixtures with an explicit UI indicator).*

### 4. Run Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Service status, FIRMS key configuration status, cache metrics |
| `/api/sensors` | `GET` | List supported FIRMS instruments, resolutions, and operational status |
| `/api/fires` | `GET` | Normalized fire observations with bounding box, source, and date filters |
| `/api/fires/kpis` | `GET` | Aggregated active fire counts, total FRP (MW), and sensor breakdown |

### Query Parameters for `/api/fires`
- `source`: Sensor filter (`ALL`, `MODIS`, `VIIRS`, `MODIS_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `VIIRS_SNPP_NRT`)
- `min_lon`, `min_lat`, `max_lon`, `max_lat`: Bounding box coordinates (WGS84)
- `day_range`: Integer window (1 to 10 days, default 1)
- `date`: Target date in `YYYY-MM-DD` format
- `min_frp`: Float minimum FRP threshold in MW
- `demo`: Boolean (`true` forces synthetic demo mode)

---

## Running Test Suite
```bash
pytest backend/tests
```
All tests run offline using ASGI transport and verified fixtures.
