export type SensorType = "MODIS" | "VIIRS" | "HARMONIZED" | "ALL" | string;
export type SatellitePlatform =
  | "Terra"
  | "Aqua"
  | "Suomi-NPP"
  | "NOAA-20"
  | "NOAA-21"
  | "Fused Constellation"
  | string;
export type ConfidenceLevel = "nominal" | "high" | "low" | number;

export interface HotspotObservation {
  id: string;
  latitude: number;
  longitude: number;
  brightnessKelvin: number | null;
  scanAngle: number | null;
  trackKm: number | null;
  acquisitionDate: string;
  acquisitionTimeUtc: string | null;
  satellite: SatellitePlatform;
  sensor: "MODIS" | "VIIRS" | "HARMONIZED";
  confidence: number | null; // 0-100% or null if not reported
  version: string | null;
  brightT31Kelvin: number | null;
  frpMw: number | null; // Fire Radiative Power in Megawatts, null if uncalculated
  dayNight: "D" | "N" | null;
  landCover: string;
  region: string;
  country: string;
  isHarmonizedMatch?: boolean;
  pairedObservationId?: string;
  isLive?: boolean;
  sensorSource?: string;
  rawFields?: Record<string, unknown>;
}

export interface HotspotKpis {
  totalHotspots: number;
  totalHotspotsDelta?: number | null;
  modisCount: number;
  modisDelta?: number | null;
  viirsCount: number;
  viirsDelta?: number | null;
  harmonizedMatches?: number | null;
  harmonizedDelta?: number | null;
  totalFrpGigawatts: number;
  avgConfidence?: number | null;
  activeSensorsOnline?: number;
  totalSensors?: number;
  activeFeedCount?: number;
  totalFeedCount?: number;
  detectedPlatformCount?: number;
  totalPlatformCount?: number;
  detectedSatellites?: string[];
  daytimeCount?: number;
  nighttimeCount?: number;
  isLive?: boolean;
  dataSource?: "NASA_FIRMS_LIVE" | "DEMO_FIXTURES";
}

export interface ActivityTrendPoint {
  timeLabel: string;
  timestamp: string;
  modisDetections: number;
  viirsDetections: number;
  harmonizedMatches: number;
  totalFrpMw: number;
  meanConfidence: number;
}

export interface RegionalMetric {
  regionId: string;
  regionName: string;
  activeHotspots: number;
  highestFrpMw: number;
  dominantLandCover: string;
  trend: "rising" | "stable" | "declining";
  centerLat: number;
  centerLon: number;
  zoomLevel: number;
}

export interface SensorSpecification {
  id: string;
  name: string;
  platforms: string[];
  spatialResolution: string;
  revisitRate: string;
  equatorCrossingTime: string;
  spectralBands: string;
  frpAccuracy: string;
  primaryStrengths: string[];
  limitations: string[];
  status: "Operational" | "Degraded" | "Offline";
}

export interface FireAlert {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "advisory";
  title: string;
  region: string;
  frpMw: number;
  sensorSource: "MODIS" | "VIIRS" | "HARMONIZED";
  coordinates: [number, number];
  affectedAreaKm2: number;
  status: "active" | "contained" | "monitoring";
  summary: string;
}

export interface BackendObservation {
  id: string;
  latitude: number;
  longitude: number;
  acquisition_date: string;
  acquisition_time_utc?: string | null;
  satellite: string;
  instrument: "MODIS" | "VIIRS" | "OTHER";
  sensor_source: string;
  confidence: unknown;
  confidence_numeric?: number | null;
  frp_mw?: number | null;
  brightness_kelvin?: number | null;
  bright_t31_kelvin?: number | null;
  scan_angle?: number | null;
  track_km?: number | null;
  day_night?: "D" | "N" | null;
  version?: string | null;
  region?: string | null;
  is_live: boolean;
  raw_fields?: Record<string, unknown>;
}

export interface BackendFireResponse {
  is_live: boolean;
  data_source: "NASA_FIRMS_LIVE" | "DEMO_FIXTURES";
  status?: "healthy" | "degraded" | "demo_fallback";
  is_partial?: boolean;
  succeeded_sources?: string[];
  failed_sources?: string[];
  active_feed_count?: number;
  total_feed_count?: number;
  detected_platform_count?: number;
  total_platform_count?: number;
  detected_satellites?: string[];
  fetched_at: string;
  total_count: number;
  observations: BackendObservation[];
  kpis: {
    total_hotspots: number;
    modis_count: number;
    viirs_count: number;
    total_frp_mw: number;
    avg_confidence?: number | null;
    max_frp_mw?: number | null;
    daytime_count: number;
    nighttime_count: number;
    detected_satellites?: string[];
  };
  attribution: string;
  notice?: string | null;
  bounding_box?: number[] | null;
  applied_source: string;
}

export interface BackendHealthResponse {
  status: string;
  app_name: string;
  version: string;
  nasa_firms_configured: boolean;
  data_mode: "LIVE_CONFIGURED" | "DEMO_FALLBACK";
  cache_entries: number;
  timestamp_utc: string;
  upstream_firms_endpoint: string;
  message: string;
}
