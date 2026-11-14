"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Scale,
  Sliders,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { HarmonizedEvent, HarmonizationStats } from "@/types/fire";
import { fetchHarmonizationEvents } from "@/lib/api";
import { formatCoordinates, formatFRP } from "@/lib/utils";

export default function SensorComparisonPage() {
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
      {/* Page Header */}
      <PageHeader
        badge="Harmonization Engine / Sensor Cross-Calibration"
        title="MODIS vs VIIRS Sensor Harmonization"
        description="Physical sensor characterization, footprint expansion modeling, and real-time spatio-temporal event association across polar orbit tracks."
        action={
          <button
            onClick={() => loadHarmonization()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-900" : ""}`} />
            <span>Recompute Workbench</span>
          </button>
        }
      />

      {/* Interactive Harmonization Engine Workbench */}
      <div className="sci-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Phase 3 Harmonization Parameters (AgniNet-Harmonize-v1.1.1)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune spatial matching tolerance and temporal coincidence thresholds to inspect candidate pairing dynamics.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {isLive ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                NASA FIRMS Live
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Synthetic Testbed
              </span>
            )}
          </div>
        </div>

        {/* Sliders and Classification Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-md bg-slate-50 border border-slate-200 text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Spatial Radius Threshold</span>
              <span className="font-mono text-slate-900 font-semibold">{spatialThreshold.toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.5}
              value={spatialThreshold}
              onChange={(e) => setSpatialThreshold(parseFloat(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Accounts for scan expansion up to ~4.8 km at swath edge</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Temporal Coincidence Window</span>
              <span className="font-mono text-slate-900 font-semibold">{temporalThreshold} min</span>
            </div>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={temporalThreshold}
              onChange={(e) => setTemporalThreshold(parseFloat(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Matches afternoon constellation overpasses (~15-50 min)</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-slate-600 font-medium block">Event Classification Filter</span>
            <div className="flex flex-wrap gap-1">
              {(["ALL", "MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setClassificationFilter(cls)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    classificationFilter === cls
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
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
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Events</span>
              <span className="text-xl font-bold font-mono text-slate-900">{stats.total_events}</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-emerald-200 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-emerald-700 block">Matched (Dual)</span>
              <span className="text-xl font-bold font-mono text-emerald-800">{stats.matched_events}</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-purple-200 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-purple-700 block">MODIS-Only</span>
              <span className="text-xl font-bold font-mono text-purple-900">{stats.modis_only_count}</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-sky-200 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sky-700 block">VIIRS-Only</span>
              <span className="text-xl font-bold font-mono text-sky-900">{stats.viirs_only_count}</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-amber-200 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-amber-700 block">Ambiguous</span>
              <span className="text-xl font-bold font-mono text-amber-900">{stats.ambiguous_count}</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Mean Spatial &Delta;</span>
              <span className="text-xl font-bold font-mono text-slate-800">
                {stats.mean_spatial_distance_km !== null ? `${stats.mean_spatial_distance_km} km` : "N/A"}
              </span>
            </div>
          </div>
        )}

        {/* Harmonized Unified Events Table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-mono">
            <span>Showing {events.length} unified event association(s)</span>
            <span className="text-[11px] text-slate-400">Algorithm: AgniNet-Harmonize-v1.1.1</span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold font-mono">
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
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {events.slice(0, 50).map((evt) => {
                  const isExpanded = expandedEventId === evt.id;
                  const badgeClass =
                    evt.classification === "MATCHED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : evt.classification === "MODIS_ONLY"
                      ? "bg-purple-50 text-purple-800 border-purple-200"
                      : evt.classification === "VIIRS_ONLY"
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : "bg-amber-50 text-amber-800 border-amber-200";

                  return (
                    <React.Fragment key={evt.id}>
                      <tr
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {evt.id}
                          </div>
                          <span className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-semibold border ${badgeClass}`}>
                            {evt.classification.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {formatCoordinates(evt.latitude, evt.longitude)}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-medium text-slate-900 text-xs">
                            {[...evt.modis_satellites, ...evt.viirs_satellites].join(", ") || "Unassigned"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {evt.modis_observation_ids.length} MODIS &bull; {evt.viirs_observation_ids.length} VIIRS
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-purple-800 font-bold">
                          {formatFRP(evt.modis_frp_mw)}
                        </td>
                        <td className="py-2.5 px-3 text-sky-800 font-bold">
                          {formatFRP(evt.viirs_total_frp_mw)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {evt.spatial_distance_km !== null ? `${evt.spatial_distance_km} km` : "—"} &bull;{" "}
                          {evt.temporal_difference_minutes !== null ? `${evt.temporal_difference_minutes}m` : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {Math.round(evt.match_score * 100)}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button className="text-slate-500 hover:text-slate-900 p-1 cursor-pointer">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={8} className="p-4 space-y-3 font-sans">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="p-3 rounded bg-white border border-slate-200 space-y-1.5">
                                <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">
                                  Scientific Evidence Trail
                                </span>
                                <p className="text-slate-700 leading-relaxed text-xs">
                                  {evt.evidence_notes}
                                </p>
                                <div className="text-[10px] text-slate-500 font-mono pt-1">
                                  Acquisition Window: {evt.earliest_acq_utc ?? "—"} to {evt.latest_acq_utc ?? "—"} UTC
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 font-mono">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">Spatial Sub-Score</span>
                                    <span className="text-slate-900 font-semibold">
                                      {evt.spatial_score !== undefined && evt.spatial_score !== null ? `${Math.round(evt.spatial_score * 100)}%` : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">Temporal Sub-Score</span>
                                    <span className="text-slate-900 font-semibold">
                                      {evt.temporal_score !== undefined && evt.temporal_score !== null ? `${Math.round(evt.temporal_score * 100)}%` : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3 rounded bg-white border border-slate-200 space-y-1.5 font-mono">
                                <span className="text-[10px] uppercase text-slate-500 font-semibold block font-sans">
                                  Telemetry & Sub-Pixel Measurements (Preserved Separately)
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">MODIS FRP (1km)</span>
                                    <span className="font-bold text-purple-800">
                                      {formatFRP(evt.modis_frp_mw)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">VIIRS Total Sub-Pixel FRP</span>
                                    <span className="font-bold text-sky-800">
                                      {formatFRP(evt.viirs_total_frp_mw)}
                                    </span>
                                  </div>
                                </div>
                                {evt.viirs_individual_frps.length > 0 && (
                                  <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-100">
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
      <div className="sci-card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Scale className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Sensor Architecture & Radiometric Performance Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold font-mono">
                <th className="py-2.5 px-3">Feature / Metric</th>
                <th className="py-2.5 px-3 text-purple-800">MODIS (EOS AM-1 / PM-1)</th>
                <th className="py-2.5 px-3 text-sky-800">VIIRS (S-NPP / NOAA-20/21)</th>
                <th className="py-2.5 px-3 text-slate-900">AgniNet Harmonized Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Nadir Spatial Resolution</td>
                <td className="py-2.5 px-3 font-mono">1000m (1.0 km)</td>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-800">375m (I-Bands)</td>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Sub-pixel 375m Grid Fusion</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Swath Edge Degradation</td>
                <td className="py-2.5 px-3 text-slate-500">Severe bow-tie effect (~4.8 km edge)</td>
                <td className="py-2.5 px-3 text-slate-700">Constrained aggregation (&lt;0.8 km edge)</td>
                <td className="py-2.5 px-3 text-slate-900 font-medium">Dynamic geometric projection correction</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Primary Mid-IR Fire Band</td>
                <td className="py-2.5 px-3 font-mono">Band 21/22 (3.96 µm)</td>
                <td className="py-2.5 px-3 font-mono">I-Band 4 (3.74 µm) / M13 (4.05 µm)</td>
                <td className="py-2.5 px-3 font-mono">Radiance cross-calibrated spline</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Thermal IR Background Band</td>
                <td className="py-2.5 px-3 font-mono">Band 31 (11.0 µm)</td>
                <td className="py-2.5 px-3 font-mono">I-Band 5 (11.45 µm)</td>
                <td className="py-2.5 px-3 font-mono">Surface temp normalization</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Small Fire Detectability</td>
                <td className="py-2.5 px-3 text-slate-500">&gt;0.05 &ndash; 0.1 hectare threshold</td>
                <td className="py-2.5 px-3 text-sky-800 font-semibold">&gt;0.005 hectare (~10x smaller)</td>
                <td className="py-2.5 px-3 text-slate-900 font-medium">Dual-pass verified micro-hotspot detection</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Saturation Temperature</td>
                <td className="py-2.5 px-3 font-mono">&gt;500 K (High threshold)</td>
                <td className="py-2.5 px-3 font-mono">~367 K (I4 saturates, falls back to M13)</td>
                <td className="py-2.5 px-3 font-mono text-emerald-700">Multi-band fallback saturation handling</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Constellation Revisit Density</td>
                <td className="py-2.5 px-3">2 daily overpasses (Terra + Aqua)</td>
                <td className="py-2.5 px-3">4&ndash;6 daily passes (3 spacecraft)</td>
                <td className="py-2.5 px-3 text-slate-900 font-semibold">Continuous merged stream (~3h latency)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
