from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import fires, health, sensors, harmonization, history

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend service harmonizing NASA FIRMS MODIS (1km) and VIIRS (375m) live active fire observations for AgniNet.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware to allow Next.js frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],  # Allow development origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(sensors.router)
app.include_router(fires.router)
app.include_router(harmonization.router)
app.include_router(history.router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
        "nasa_firms_configured": settings.is_firms_configured,
        "docs": "/docs",
        "endpoints": {
            "health": "/api/health",
            "sensors": "/api/sensors",
            "fires": "/api/fires",
            "kpis": "/api/fires/kpis",
            "harmonized_events": "/api/harmonization/events",
            "harmonization_stats": "/api/harmonization/stats",
            "harmonization_partitions": "/api/harmonization/observations",
            "history_summary": "/api/history/summary",
            "history_trends": "/api/history/trends",
            "history_calendar": "/api/history/calendar",
            "history_regions": "/api/history/regions",
            "history_sensors": "/api/history/sensors",
            "history_events": "/api/history/events",
        },
    }
