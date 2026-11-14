"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DEMO_SENSOR_SPECS } from "@/data/fixtures";
import {
  Satellite,
  Radio,
  GitMerge,
  Zap,
  Scale,
} from "lucide-react";

export default function SensorComparisonPage() {
  const [selectedSensorId, setSelectedSensorId] = useState<string>("HARMONIZED");

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Sensor Harmonization Engine"
        title="Cross-Sensor Technical Specifications & Harmonization"
        description="Comprehensive technical analysis comparing NASA EOS MODIS (1km) against JPSS VIIRS (375m) radiometers, and the AgniNet unified cross-calibration framework."
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
            The AgniNet Harmonization Architecture (Phase 1 Methodology)
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
              Groups overlapping pixels acquired within a 45-minute satellite pass window using a density-based spatial cluster algorithm (DBSCAN).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-cyan-400 block">02 / RADIANCE FUSION</span>
            <h5 className="font-semibold text-xs text-slate-200">FRP Cross-Calibration</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Harmonizes sensor-specific Point Spread Functions (PSF) and scan angle effects to ensure Fire Radiative Power (MW) energy parity.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-amber-400 block">03 / FILTERING</span>
            <h5 className="font-semibold text-xs text-slate-200">Static Anomaly Rejection</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cross-references global thermal database masks to weed out industrial flares, gas flaring sites, metal refineries, and active volcanoes.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
            <span className="font-mono text-xs font-bold text-emerald-400 block">04 / COMPOSITING</span>
            <h5 className="font-semibold text-xs text-slate-200">Unified Confidence Scoring</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Computes a single Bayesian confidence score combining multi-sensor agreement, atmospheric optical depth, and background solar glint.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
