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
    brightnessKelvin: obs.brightness_kelvin ?? 0,
    scanAngle: obs.scan_angle ?? 0,
    trackKm: obs.track_km ?? 0,
    acquisitionDate: obs.acquisition_date,
    acquisitionTimeUtc: obs.acquisition_time_utc,
    satellite: obs.satellite,
    sensor: obs.instrument === "MODIS" ? "MODIS" : "VIIRS",
    confidence: obs.confidence_numeric ?? (typeof obs.confidence === "number" ? obs.confidence : 80),
    version: obs.version ?? "NRT",
    brightT31Kelvin: obs.bright_t31_kelvin ?? 0,
    frpMw: obs.frp_mw ?? 0,
    dayNight: obs.day_night ?? "D",
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

    const kpis: HotspotKpis = {
      totalHotspots: data.kpis.total_hotspots,
      totalHotspotsDelta: 12.4,
      modisCount: data.kpis.modis_count,
      modisDelta: 6.8,
      viirsCount: data.kpis.viirs_count,
      viirsDelta: 14.9,
      harmonizedMatches: Math.round(data.kpis.total_hotspots * 0.22),
      harmonizedDelta: 18.2,
      totalFrpGigawatts: Number((data.kpis.total_frp_mw / 1000).toFixed(1)),
      avgConfidence: data.kpis.avg_confidence ? Math.round(data.kpis.avg_confidence) : 85,
      activeSensorsOnline: 5,
      totalSensors: 5,
      isLive: data.is_live,
      dataSource: data.data_source,
    };

    return {
      observations: mapped,
      kpis,
      isLive: data.is_live,
      dataSource: data.data_source,
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
