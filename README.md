# AgniNet — Unified Satellite Fire Intelligence

> **NASA Space Apps Challenge 2026** &bull; Global Wildfire Intelligence Track

AgniNet is a production-quality scientific geospatial intelligence platform that harmonizes heterogeneous spaceborne active fire radiometry from **NASA EOS (MODIS 1km)** and **NOAA JPSS (VIIRS 375m)** into a unified real-time wildfire observation and radiative power quantification pipeline.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    AgniNet Next.js App Router (UI)   │
                      │  (Map, KPI Cards, Hotspot Table)     │
                      └──────────────────┬───────────────────┘
                                         │ JSON over HTTP
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    FastAPI Microservice (/backend)   │
                      │  - Pydantic Validations              │
                      │  - In-Memory TTL Cache (5 min)       │
                      │  - Deduplication Engine              │
                      └──────────┬───────────────────┬───────┘
          If MAP_KEY configured  │                   │ If MAP_KEY absent/error
                                 ▼                   ▼
            ┌───────────────────────────┐    ┌───────────────────────────┐
            │   NASA FIRMS Area API     │    │  High-Fidelity Synthetic  │
            │  (MODIS 1km & VIIRS 375m) │    │   DEMO Fallback Service   │
            │  Secret MAP_KEY (backend) │    │ (Clearly Labeled Badges)  │
            └───────────────────────────┘    └───────────────────────────┘
```

---

## Key Features

### Phase 1 — Scientific Frontend Foundation
- **Responsive Mission Shell**: Collapsible sidebar, mission UTC clock, critical alert center, and responsive navigation across all screen sizes.
- **Interactive Global Fire Canvas**: MapLibre GL JS integration with dark scientific styling, custom glowing ember markers, radiative power filters ($>0$ to $>500$ MW), hot zone fly-to presets, and deep telemetry inspection popups.
- **Diurnal Trajectory & Hotspot Table**: Recharts diurnal radiative energy curves and real-time tabular observation log with 1-click WGS84 coordinate copying and GeoJSON export.
- **Seven Core Mission Routes**:
  - `/` — Overview Dashboard & KPIs
  - `/map` — Dedicated Fullscreen Geospatial Fire Explorer
  - `/calendar` — 30-Day Fire Activity Heatmap & Seasonality Index
  - `/historical` — Multi-Year Climatology (2018–2026) & Carbon Flux Modeling
  - `/sensors` — Technical Sensor Matrix: MODIS (1km) vs. VIIRS (375m) Harmonization
  - `/alerts` — Megafire Critical Warnings & Webhook Dispatch Integration
  - `/about` — Scientific Methodology & NASA Mission Objectives

### Phase 2 — NASA FIRMS Live Data Integration
- **FastAPI Microservice (`/backend`)**: Validated endpoints for live observation streaming, sensor availability, and system health.
- **Unified Observation Schema**: Standardizes MODIS ($T_{21}, T_{31}$, $0\text{--}100\%$ confidence) and VIIRS ($I_4, I_5$, $375\text{m}$, categorical confidence) while preserving raw instrument channels.
- **Deterministic Deduplication**: Prevents duplicate points across overlapping swaths and merged feeds.
- **Zero-Credential DEMO Fallback**: Seamless fallback to clearly marked synthetic fixtures when `NASA_FIRMS_MAP_KEY` is not provided.
- **Secret Isolation**: The NASA `MAP_KEY` is strictly held on the backend and never exposed to the client browser.

---

## Quickstart

### Prerequisites
- Node.js $\ge$ 18 (Node 22 recommended)
- Python $\ge$ 3.10 (Python 3.14 supported)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# Activate Virtual Environment:
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Configure Environment
cp .env.example .env

# Optional: Add your free NASA FIRMS MAP_KEY to backend/.env
# Get a key at https://firms.modaps.eosdis.nasa.gov/api/map_key/
# NASA_FIRMS_MAP_KEY=your_32_character_firms_key_here

# Run FastAPI Server (port 8000)
python -m uvicorn app.main:app --reload --port 8000
```
Interactive API docs:
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 2. Frontend Setup
```bash
# In the project root
npm install

# Start Next.js Development Server
npm run dev
# Open http://localhost:3000
```

---

## Testing & Quality Assurance

### Backend Test Suite (Pytest)
```bash
cd backend
pytest tests -v
```
Runs 16 unit and integration tests covering health checks, sensor metadata, CSV parsing for MODIS/VIIRS, coordinate/date validation, and demo fallback without external network dependencies.

### Frontend Quality Gates
```bash
# Strict TypeScript Typecheck
npx tsc --noEmit

# ESLint Code Quality Verification
npm run lint

# Production Build
npm run build
```

---

## Data Sources & Attribution
- **NASA FIRMS**: Fire Information for Resource Management System, Land, Atmosphere Near real-time Capability for EOS (LANCE), NASA Goddard Space Flight Center.
- **NOAA JPSS**: Joint Polar Satellite System Visible Infrared Imaging Radiometer Suite (VIIRS).
- **Basemap**: OpenStreetMap contributors & CARTO Dark Matter.

---

## License
MIT License &bull; Developed for the NASA Space Apps Challenge 2026.
