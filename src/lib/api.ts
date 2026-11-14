import {
  BackendFireResponse,
  BackendHealthResponse,
  BackendObservation,
  HarmonizationResponse,
  HistoricalCalendarResponse,
  HistoricalEventsResponse,
  HistoricalRegionsResponse,
  HistoricalSensorsResponse,
  HistoricalSummary,
  HistoricalTrendsResponse,
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

    // Query Phase 3 Cross-Sensor Harmonization Engine to link real MODIS and VIIRS dual-sensor matches
    let realHarmonizedMatches = 0;
    try {
      const harmRes = await fetch(`${API_BASE_URL}/api/harmonization/events?${query.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (harmRes.ok) {
        const harmData: HarmonizationResponse = await harmRes.json();
        realHarmonizedMatches = harmData.stats.matched_events;
        const matchedObsIds = new Set<string>();
        const eventIdByObs = new Map<string, string>();
        for (const evt of harmData.events) {
          if (evt.classification === "MATCHED") {
            for (const id of [...evt.modis_observation_ids, ...evt.viirs_observation_ids]) {
              matchedObsIds.add(id);
              eventIdByObs.set(id, evt.id);
            }
          }
        }
        for (const obs of mapped) {
          if (matchedObsIds.has(obs.id)) {
            obs.isHarmonizedMatch = true;
            obs.pairedObservationId = eventIdByObs.get(obs.id);
          }
        }
      }
    } catch {
      // Harmonization engine query failed or offline; leave observations unlinked
    }

    const isLive = data.is_live;
    const kpis: HotspotKpis = {
      totalHotspots: data.kpis.total_hotspots,
      // No arbitrary or hardcoded deltas; unavailable without multi-day historical baseline archive
      totalHotspotsDelta: null,
      modisCount: data.kpis.modis_count,
      modisDelta: null,
      viirsCount: data.kpis.viirs_count,
      viirsDelta: null,
      // Phase 3 Cross-Sensor Harmonization: Real matched dual-pass events count (never arbitrary percentage)
      harmonizedMatches: realHarmonizedMatches,
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

export interface FetchHarmonizationParams extends FetchFiresParams {
  spatial_threshold_km?: number;
  temporal_threshold_minutes?: number;
  classification?: string;
}

export async function fetchHarmonizationEvents(
  params: FetchHarmonizationParams = {}
): Promise<HarmonizationResponse> {
  const query = new URLSearchParams();
  if (params.source) query.set("source", params.source);
  if (params.min_lon !== undefined) query.set("min_lon", String(params.min_lon));
  if (params.min_lat !== undefined) query.set("min_lat", String(params.min_lat));
  if (params.max_lon !== undefined) query.set("max_lon", String(params.max_lon));
  if (params.max_lat !== undefined) query.set("max_lat", String(params.max_lat));
  if (params.day_range) query.set("day_range", String(params.day_range));
  if (params.date) query.set("date", params.date);
  if (params.min_frp !== undefined) query.set("min_frp", String(params.min_frp));
  if (params.spatial_threshold_km !== undefined) {
    query.set("spatial_threshold_km", String(params.spatial_threshold_km));
  }
  if (params.temporal_threshold_minutes !== undefined) {
    query.set("temporal_threshold_minutes", String(params.temporal_threshold_minutes));
  }
  if (params.classification) query.set("classification", params.classification);
  if (params.demo) query.set("demo", "true");

  const res = await fetch(`${API_BASE_URL}/api/harmonization/events?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Harmonization endpoint returned HTTP ${res.status}`);
  }

  return await res.json();
}

// ==========================================
// Phase 4 Historical Analytics API Fetchers
// ==========================================

export interface FetchHistoricalParams {
  start_date?: string;
  end_date?: string;
  min_lon?: number;
  min_lat?: number;
  max_lon?: number;
  max_lat?: number;
  instrument?: string;
  satellite?: string;
  region?: string;
  min_frp?: number;
  granularity?: "day" | "week" | "month";
  classification?: string;
  page?: number;
  page_size?: number;
}

function buildHistoricalQuery(params: FetchHistoricalParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);
  if (params.min_lon !== undefined) query.set("min_lon", String(params.min_lon));
  if (params.min_lat !== undefined) query.set("min_lat", String(params.min_lat));
  if (params.max_lon !== undefined) query.set("max_lon", String(params.max_lon));
  if (params.max_lat !== undefined) query.set("max_lat", String(params.max_lat));
  if (params.instrument) query.set("instrument", params.instrument);
  if (params.satellite) query.set("satellite", params.satellite);
  if (params.region) query.set("region", params.region);
  if (params.min_frp !== undefined) query.set("min_frp", String(params.min_frp));
  if (params.granularity) query.set("granularity", params.granularity);
  if (params.classification) query.set("classification", params.classification);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.page_size !== undefined) query.set("page_size", String(params.page_size));
  return query;
}

export async function fetchHistoricalSummary(
  params: FetchHistoricalParams = {}
): Promise<HistoricalSummary> {
  const query = buildHistoricalQuery(params);
  const res = await fetch(`${API_BASE_URL}/api/history/summary?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Historical summary endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchHistoricalTrends(
  params: FetchHistoricalParams = {}
): Promise<HistoricalTrendsResponse> {
  const query = buildHistoricalQuery(params);
  const res = await fetch(`${API_BASE_URL}/api/history/trends?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Historical trends endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchHistoricalCalendar(
  params: FetchHistoricalParams = {}
): Promise<HistoricalCalendarResponse> {
  const query = buildHistoricalQuery(params);
  const res = await fetch(`${API_BASE_URL}/api/history/calendar?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Historical calendar endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchHistoricalRegions(
  params: FetchHistoricalParams = {}
): Promise<HistoricalRegionsResponse> {
  const query = buildHistoricalQuery(params);
  const res = await fetch(`${API_BASE_URL}/api/history/regions?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Historical regions endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchHistoricalSensors(
  params: FetchHistoricalParams = {}
): Promise<HistoricalSensorsResponse> {
  const query = buildHistoricalQuery(params);
  const res = await fetch(`${API_BASE_URL}/api/history/sensors?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Historical sensors endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchHistoricalEvents(
  params: FetchHistoricalParams = {}
): Promise<HistoricalEventsResponse> {
  const query = buildHistoricalQuery(params);
  const res = await fetch(`${API_BASE_URL}/api/history/events?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `Historical events endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}
