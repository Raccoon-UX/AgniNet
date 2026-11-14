import {
  BackendFireResponse,
  BackendHealthResponse,
  BackendObservation,
  HotspotKpis,
  HotspotObservation,
} from "@/types/fire";
import { DEMO_HOTSPOTS, DEMO_KPIS } from "@/data/fixtures";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FetchFiresParams {
  source?: string;
  min_lon?: number;
  min_lat?: number;
  max_lon?: number;
  max_lat?: number;
  day_range?: number;
  date?: string;
  min_frp?: number;
  demo?: boolean;
}

export function mapBackendToHotspot(obs: BackendObservation): HotspotObservation {
  return {
    id: obs.id,
    latitude: obs.latitude,
    longitude: obs.longitude,
    brightnessKelvin: obs.brightness_kelvin ?? null,
    scanAngle: obs.scan_angle ?? null,
    trackKm: obs.track_km ?? null,
    acquisitionDate: obs.acquisition_date,
    acquisitionTimeUtc: obs.acquisition_time_utc ?? null,
    satellite: obs.satellite,
    sensor: obs.instrument === "MODIS" ? "MODIS" : "VIIRS",
    confidence: obs.confidence_numeric ?? (typeof obs.confidence === "number" ? obs.confidence : null),
    version: obs.version ?? null,
    brightT31Kelvin: obs.bright_t31_kelvin ?? null,
    frpMw: obs.frp_mw ?? null,
    dayNight: obs.day_night ?? null,
    landCover: obs.raw_fields?.land_cover ? String(obs.raw_fields.land_cover) : "Satellite Observed Pixel",
    region: obs.region ?? "Global Observation",
    country: obs.raw_fields?.country ? String(obs.raw_fields.country) : "Monitored Sector",
    isLive: obs.is_live,
    sensorSource: obs.sensor_source,
    rawFields: obs.raw_fields,
  };
}

export async function fetchObservations(
  params: FetchFiresParams = {}
): Promise<{
  observations: HotspotObservation[];
  kpis: HotspotKpis;
  isLive: boolean;
  dataSource: "NASA_FIRMS_LIVE" | "DEMO_FIXTURES";
  status?: "healthy" | "degraded" | "demo_fallback";
  isPartial?: boolean;
  succeededSources?: string[];
  failedSources?: string[];
  fetchedAt: string;
  attribution: string;
  notice?: string | null;
  error?: string | null;
}> {
  const query = new URLSearchParams();
  if (params.source) query.set("source", params.source);
  if (params.min_lon !== undefined) query.set("min_lon", String(params.min_lon));
  if (params.min_lat !== undefined) query.set("min_lat", String(params.min_lat));
  if (params.max_lon !== undefined) query.set("max_lon", String(params.max_lon));
  if (params.max_lat !== undefined) query.set("max_lat", String(params.max_lat));
  if (params.day_range) query.set("day_range", String(params.day_range));
  if (params.date) query.set("date", params.date);
  if (params.min_frp !== undefined) query.set("min_frp", String(params.min_frp));
  if (params.demo) query.set("demo", "true");

  try {
    const res = await fetch(`${API_BASE_URL}/api/fires?${query.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(
        errJson.detail || `Backend returned HTTP ${res.status}`
      );
    }

    const data: BackendFireResponse = await res.json();
    const mapped = data.observations.map(mapBackendToHotspot);

    const isLive = data.is_live;
    const kpis: HotspotKpis = {
      totalHotspots: data.kpis.total_hotspots,
      // No arbitrary or hardcoded deltas; unavailable without multi-day historical baseline archive
      totalHotspotsDelta: null,
      modisCount: data.kpis.modis_count,
      modisDelta: null,
      viirsCount: data.kpis.viirs_count,
      viirsDelta: null,
      // Never calculate harmonized matches as an arbitrary percentage; pending Phase 3 cross-sensor engine
      harmonizedMatches: null,
      harmonizedDelta: null,
      totalFrpGigawatts: Number((data.kpis.total_frp_mw / 1000).toFixed(1)),
      avgConfidence: data.kpis.avg_confidence != null ? Math.round(data.kpis.avg_confidence) : null,
      activeSensorsOnline: data.active_feed_count ?? (data.succeeded_sources ? data.succeeded_sources.length : (isLive ? 4 : 4)),
      totalSensors: 4,
      activeFeedCount: data.active_feed_count ?? (data.succeeded_sources ? data.succeeded_sources.length : (isLive ? 4 : 4)),
      totalFeedCount: 4,
      detectedPlatformCount: data.detected_platform_count ?? (data.kpis.detected_satellites ? data.kpis.detected_satellites.length : (isLive ? 0 : 5)),
      totalPlatformCount: 5,
      detectedSatellites: data.detected_satellites ?? data.kpis.detected_satellites ?? (isLive ? [] : ["Terra", "Aqua", "Suomi-NPP", "NOAA-20", "NOAA-21"]),
      daytimeCount: data.kpis.daytime_count,
      nighttimeCount: data.kpis.nighttime_count,
      isLive: data.is_live,
      dataSource: data.data_source,
    };

    return {
      observations: mapped,
      kpis,
      isLive: data.is_live,
      dataSource: data.data_source,
      status: data.status,
      isPartial: data.is_partial,
      succeededSources: data.succeeded_sources,
      failedSources: data.failed_sources,
      fetchedAt: data.fetched_at,
      attribution: data.attribution,
      notice: data.notice,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[AgniNet] Backend API unavailable (${errorMsg}). Falling back to local DEMO fixtures.`);

    return {
      observations: DEMO_HOTSPOTS,
      kpis: DEMO_KPIS,
      isLive: false,
      dataSource: "DEMO_FIXTURES",
      status: "demo_fallback",
      isPartial: false,
      fetchedAt: new Date().toISOString(),
      attribution: "AgniNet Synthetic FIRMS Fixtures (Backend Offline Demo Fallback)",
      notice: `BACKEND OFFLINE (${errorMsg}). Showing local demo fixtures. Run backend server on port 8000 for live telemetry.`,
      error: errorMsg,
    };
  }
}

export async function checkBackendHealth(): Promise<BackendHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
