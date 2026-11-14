"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DEMO_SENSOR_SPECS } from "@/data/fixtures";
import {
  Satellite,
  Radio,
  GitMerge,
  Zap,
  Scale,
  Sliders,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { HarmonizedEvent, HarmonizationStats } from "@/types/fire";
import { fetchHarmonizationEvents } from "@/lib/api";
import { formatCoordinates, formatFRP } from "@/lib/utils";

export default function SensorComparisonPage() {
  const [selectedSensorId, setSelectedSensorId] = useState<string>("HARMONIZED");

  // Harmonization Engine Live Controls
  const [spatialThreshold, setSpatialThreshold] = useState<number>(2.0);
  const [temporalThreshold, setTemporalThreshold] = useState<number>(120.0);
  const [classificationFilter, setClassificationFilter] = useState<string>("ALL");
  const [events, setEvents] = useState<HarmonizedEvent[]>([]);
  const [stats, setStats] = useState<HarmonizationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const loadHarmonization = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchHarmonizationEvents({
        spatial_threshold_km: spatialThreshold,
        temporal_threshold_minutes: temporalThreshold,
        classification: classificationFilter !== "ALL" ? classificationFilter : undefined,
      });
      setEvents(res.events);
      setStats(res.stats);
      setIsLive(res.is_live);
    } catch {
      // Fallback demo query
      try {
        const res = await fetchHarmonizationEvents({
          demo: true,
          spatial_threshold_km: spatialThreshold,
          temporal_threshold_minutes: temporalThreshold,
          classification: classificationFilter !== "ALL" ? classificationFilter : undefined,
        });
        setEvents(res.events);
        setStats(res.stats);
        setIsLive(false);
      } catch (err) {
        console.warn("Harmonization fetch error", err);
      }
    } finally {
      setLoading(false);
    }
  }, [spatialThreshold, temporalThreshold, classificationFilter]);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      try {
        const res = await fetchHarmonizationEvents({
          spatial_threshold_km: spatialThreshold,
          temporal_threshold_minutes: temporalThreshold,
          classification: classificationFilter !== "ALL" ? classificationFilter : undefined,
        });
        if (!ignore) {
          setEvents(res.events);
          setStats(res.stats);
          setIsLive(res.is_live);
          setLoading(false);
        }
      } catch {
        try {
          const res = await fetchHarmonizationEvents({
            demo: true,
            spatial_threshold_km: spatialThreshold,
            temporal_threshold_minutes: temporalThreshold,
            classification: classificationFilter !== "ALL" ? classificationFilter : undefined,
          });
          if (!ignore) {
            setEvents(res.events);
            setStats(res.stats);
            setIsLive(false);
            setLoading(false);
          }
        } catch (err) {
          console.warn("Harmonization fetch error", err);
          if (!ignore) setLoading(false);
        }
      }
    }
    execute();
    return () => {
      ignore = true;
    };
  }, [spatialThreshold, temporalThreshold, classificationFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Phase 3 Harmonization Engine"
        title="Cross-Sensor Technical Specifications & Spatial-Temporal Engine"
        description="Associating NASA EOS MODIS (1km) and JPSS VIIRS (375m) active-fire observations into scientifically defensible unified events with strict radiative energy preservation."
      />

      {/* Sensor Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEMO_SENSOR_SPECS.map((spec) => {
          const isSelected = selectedSensorId === spec.id;
          return (
            <div
              key={spec.id}
              onClick={() => setSelectedSensorId(spec.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "glass-panel-glow border-orange-500/50 ring-1 ring-orange-500/40"
                  : "glass-panel border-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {spec.id === "MODIS" && <Satellite className="w-5 h-5 text-purple-400" />}
                  {spec.id === "VIIRS" && <Radio className="w-5 h-5 text-cyan-400" />}
                  {spec.id === "HARMONIZED" && <GitMerge className="w-5 h-5 text-amber-400" />}
                  <span className="font-bold text-sm text-white">{spec.id}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                  {spec.status}
                </span>
              </div>

              <h4 className="mt-3 font-semibold text-xs text-slate-200">
                {spec.name}
              </h4>

              <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="font-mono text-slate-200 font-semibold truncate max-w-[150px]">
                    {spec.spatialResolution.split(" ")[0]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Satellites:</span>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-[150px]">
                    {spec.platforms.length} Platforms
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PHASE 3 INTERACTIVE HARMONIZATION ENGINE EXPLORER */}
      <div className="rounded-xl glass-panel p-6 space-y-5 border border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-white">
                Live Harmonization Engine & Event Associator
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Haversine geodesic geometry &bull; Footprint expansion &bull; Non-arbitrary 1-to-many clustering &bull; Un-summed FRP preservation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-semibold ${
              isLive
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "text-amber-300 bg-amber-500/10 border-amber-500/20"
            }`}>
              {isLive ? "LIVE TELEMETRY HARMONIZATION" : "DEMO FIXTURES HARMONIZATION"}
            </span>

            <button
              onClick={() => loadHarmonization()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Run Harmonization
            </button>
          </div>
        </div>

        {/* Configurable Threshold Sliders & Classification Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-900/60 border border-white/5">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                Spatial Radius Threshold
              </span>
              <span className="font-mono text-orange-300 font-semibold">{spatialThreshold.toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.5}
              value={spatialThreshold}
              onChange={(e) => setSpatialThreshold(parseFloat(e.target.value))}
              className="w-full accent-orange-500"
            />
            <span className="text-[10px] text-slate-500 block">Accounts for wide-angle scan expansion up to ~4.8 km</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Temporal Coincidence Window
              </span>
              <span className="font-mono text-cyan-300 font-semibold">{temporalThreshold} min</span>
            </div>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={temporalThreshold}
              onChange={(e) => setTemporalThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block">Matches A-Train Afternoon constellation overpasses (~15-50m)</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-slate-400 text-xs block">Event Classification Filter</span>
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", "MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setClassificationFilter(cls)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    classificationFilter === cls
                      ? "bg-orange-500 text-white border border-orange-400 shadow-sm shadow-orange-500/20"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                  }`}
                >
                  {cls === "ALL" ? "All" : cls.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Harmonization Statistics Summary */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Events</span>
              <span className="text-xl font-bold font-mono text-white">{stats.total_events}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block">Matched (Dual)</span>
              <span className="text-xl font-bold font-mono text-emerald-300">{stats.matched_events}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-purple-500/20">
              <span className="text-[10px] uppercase font-mono text-purple-400 block">MODIS-Only</span>
              <span className="text-xl font-bold font-mono text-purple-300">{stats.modis_only_count}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-cyan-500/20">
              <span className="text-[10px] uppercase font-mono text-cyan-400 block">VIIRS-Only</span>
              <span className="text-xl font-bold font-mono text-cyan-300">{stats.viirs_only_count}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-amber-500/20">
              <span className="text-[10px] uppercase font-mono text-amber-400 block">Ambiguous</span>
              <span className="text-xl font-bold font-mono text-amber-300">{stats.ambiguous_count}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Mean Spatial &Delta;</span>
              <span className="text-xl font-bold font-mono text-slate-200">
                {stats.mean_spatial_distance_km !== null ? `${stats.mean_spatial_distance_km} km` : "N/A"}
              </span>
            </div>
          </div>
        )}

        {/* Harmonized Unified Events Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {events.length} unified event association(s)</span>
            <span className="font-mono text-[11px] text-slate-500">Algorithm: AgniNet-Harmonize-v1.1</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Event ID & Classification</th>
                  <th className="py-2.5 px-3">Centroid (WGS84)</th>
                  <th className="py-2.5 px-3">Spacecraft Support</th>
                  <th className="py-2.5 px-3">MODIS FRP</th>
                  <th className="py-2.5 px-3">VIIRS Total FRP</th>
                  <th className="py-2.5 px-3">Distance & Time &Delta;</th>
                  <th className="py-2.5 px-3">Match Score</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {events.slice(0, 50).map((evt) => {
                  const isExpanded = expandedEventId === evt.id;
                  const badgeClass =
                    evt.classification === "MATCHED"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : evt.classification === "MODIS_ONLY"
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : evt.classification === "VIIRS_ONLY"
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30";

                  return (
                    <React.Fragment key={evt.id}>
                      <tr
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3">
                          <div className="font-mono text-xs font-semibold text-slate-200">
                            {evt.id}
                          </div>
                          <span className={`inline-block px-1.5 py-0.2 mt-1 rounded text-[9px] font-mono font-bold border ${badgeClass}`}>
                            {evt.classification.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          {formatCoordinates(evt.latitude, evt.longitude)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[11px] font-medium text-slate-200">
                            {[...evt.modis_satellites, ...evt.viirs_satellites].join(", ") || "Unassigned"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {evt.modis_observation_ids.length} MODIS &bull; {evt.viirs_observation_ids.length} VIIRS
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-purple-300 text-[11px]">
                          {formatFRP(evt.modis_frp_mw)}
                        </td>
                        <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">
                          {formatFRP(evt.viirs_total_frp_mw)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {evt.spatial_distance_km !== null ? `${evt.spatial_distance_km} km` : "—"} &bull;{" "}
                          {evt.temporal_difference_minutes !== null ? `${evt.temporal_difference_minutes}m` : "—"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${
                                  evt.match_score >= 0.75
                                    ? "bg-emerald-400"
                                    : evt.match_score > 0.4
                                    ? "bg-amber-400"
                                    : "bg-slate-600"
                                }`}
                                style={{ width: `${Math.round(evt.match_score * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-200">
                              {Math.round(evt.match_score * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button className="text-slate-400 hover:text-white p-1 cursor-pointer">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-white/10">
                          <td colSpan={8} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5 space-y-1.5">
                                <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">
                                  Scientific Evidence Trail
                                </span>
                                <p className="text-slate-300 leading-relaxed font-sans text-xs">
                                  {evt.evidence_notes}
                                </p>
                                <div className="text-[10px] text-slate-500 font-mono pt-1">
                                  Acquisition Window: {evt.earliest_acq_utc ?? "—"} to {evt.latest_acq_utc ?? "—"} UTC
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">Spatial Sub-Score</span>
                                    <span className="font-mono text-slate-200">
                                      {evt.spatial_score !== undefined && evt.spatial_score !== null ? `${Math.round(evt.spatial_score * 100)}%` : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">Temporal Sub-Score</span>
                                    <span className="font-mono text-slate-200">
                                      {evt.temporal_score !== undefined && evt.temporal_score !== null ? `${Math.round(evt.temporal_score * 100)}%` : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5 space-y-1.5">
                                <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">
                                  Telemetry & Sub-Pixel Measurements (Preserved Separately)
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">MODIS FRP (1km)</span>
                                    <span className="font-mono font-bold text-purple-300">
                                      {formatFRP(evt.modis_frp_mw)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">VIIRS Total Sub-Pixel FRP</span>
                                    <span className="font-mono font-bold text-cyan-300">
                                      {formatFRP(evt.viirs_total_frp_mw)}
                                    </span>
                                  </div>
                                </div>
                                {evt.viirs_individual_frps.length > 0 && (
                                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                                    VIIRS Sub-pixels: [{evt.viirs_individual_frps.map((f) => `${f.toFixed(1)} MW`).join(", ")}]
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="rounded-xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
          <Scale className="w-4 h-4 text-orange-400" />
          <h3 className="text-base font-semibold text-white">
            Sensor Architecture & Radiometric Performance Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/8 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Feature / Metric</th>
                <th className="py-3 px-4 text-purple-300">MODIS (EOS AM-1 / PM-1)</th>
                <th className="py-3 px-4 text-cyan-300">VIIRS (S-NPP / NOAA-20/21)</th>
                <th className="py-3 px-4 text-amber-300">AgniNet Harmonized Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Nadir Spatial Resolution</td>
                <td className="py-3.5 px-4 font-mono">1000m (1.0 km)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">375m (I-Bands)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-amber-400">Sub-pixel 375m Grid Fusion</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Swath Edge Degradation</td>
                <td className="py-3.5 px-4 text-slate-400">Severe bow-tie effect (~4.8 km edge)</td>
                <td className="py-3.5 px-4 text-cyan-200">Constrained aggregation (&lt;0.8 km edge)</td>
                <td className="py-3.5 px-4 text-amber-200">Dynamic geometric projection correction</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Primary Mid-IR Fire Band</td>
                <td className="py-3.5 px-4 font-mono">Band 21/22 (3.96 µm)</td>
                <td className="py-3.5 px-4 font-mono">I-Band 4 (3.74 µm) / M13 (4.05 µm)</td>
                <td className="py-3.5 px-4 font-mono">Radiance cross-calibrated spline</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Thermal IR Background Band</td>
                <td className="py-3.5 px-4 font-mono">Band 31 (11.0 µm)</td>
                <td className="py-3.5 px-4 font-mono">I-Band 5 (11.45 µm)</td>
                <td className="py-3.5 px-4 font-mono">Surface temp normalization</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Small Fire Detectability</td>
                <td className="py-3.5 px-4 text-slate-400">&gt;0.05 &ndash; 0.1 hectare threshold</td>
                <td className="py-3.5 px-4 text-cyan-200 font-semibold">&gt;0.005 hectare (~10x smaller)</td>
                <td className="py-3.5 px-4 text-amber-200">Dual-pass verified micro-hotspot detection</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Saturation Temperature</td>
                <td className="py-3.5 px-4 font-mono">&gt;500 K (High threshold)</td>
                <td className="py-3.5 px-4 font-mono">~367 K (I4 saturates, falls back to M13)</td>
                <td className="py-3.5 px-4 font-mono text-emerald-400">Multi-band fallback saturation handling</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">Constellation Revisit Density</td>
                <td className="py-3.5 px-4">2 daily overpasses (Terra + Aqua)</td>
                <td className="py-3.5 px-4">4&ndash;6 daily passes (3 spacecraft)</td>
                <td className="py-3.5 px-4 text-amber-300 font-semibold">Continuous merged stream (~3h latency)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AgniNet Harmonization Methodology Explainer */}
      <div className="rounded-xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">
            The AgniNet Harmonization Architecture (Phase 3 Spatial-Temporal Engine)
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          When comparing MODIS and VIIRS directly, end users face significant discrepancies: a single large wildfire may appear as one 1000m MODIS pixel or seven distinct 375m VIIRS pixels. AgniNet bridges this gap through four algorithmic stages:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-orange-400 block">01 / DEDUPLICATION</span>
            <h5 className="font-semibold text-xs text-slate-200">Spatial-Temporal Clustering</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Groups overlapping pixels acquired within a satellite pass synchronization window using geodesic Haversine distance and dynamic scan angle expansion.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-cyan-400 block">02 / RADIANCE PRESERVATION</span>
            <h5 className="font-semibold text-xs text-slate-200">Individual Instrument Radiance</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Preserves MODIS and VIIRS FRP values independently without unscientific cross-sensor summation, respecting sensor-specific PSF differences.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-amber-400 block">03 / AMBIGUITY RESOLUTION</span>
            <h5 className="font-semibold text-xs text-slate-200">Non-Arbitrary Classification</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Explicitly categorizes complex fire complexes into MATCHED, MODIS_ONLY, VIIRS_ONLY, and AMBIGUOUS rather than forcing random one-to-one pairings.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-emerald-400 block">04 / COMPOSITING</span>
            <h5 className="font-semibold text-xs text-slate-200">Deterministic Event Scoring</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Generates deterministic event hashes and proximity-weighted match confidence scores (0-100%) grounded in empirical overpass times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
