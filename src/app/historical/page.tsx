"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { BarChart3, TrendingUp, TreePine, CloudRain } from "lucide-react";

// Synthetic multi-year demo fixtures modeling NASA FIRMS historical patterns
const ANNUAL_FIRE_HISTORY = [
  { year: "2018", modisCount: 1.82, viirsCount: 4.41, carbonTg: 1820 },
  { year: "2019", modisCount: 2.14, viirsCount: 5.28, carbonTg: 2150 },
  { year: "2020", modisCount: 2.39, viirsCount: 5.92, carbonTg: 2380 },
  { year: "2021", modisCount: 1.95, viirsCount: 4.88, carbonTg: 1960 },
  { year: "2022", modisCount: 1.88, viirsCount: 4.74, carbonTg: 1890 },
  { year: "2023", modisCount: 2.45, viirsCount: 6.18, carbonTg: 2470 },
  { year: "2024", modisCount: 2.61, viirsCount: 6.54, carbonTg: 2620 },
  { year: "2025", modisCount: 2.30, viirsCount: 5.85, carbonTg: 2310 },
  { year: "2026 (YTD)", modisCount: 2.21, viirsCount: 5.62, carbonTg: 2240 },
];

const BIOME_IMPACT_HISTORY = [
  { biome: "Tropical Moist Forest", percentage: 34, frpShare: 42, color: "#10b981" },
  { biome: "Tropical Savanna & Grassland", percentage: 38, frpShare: 31, color: "#f59e0b" },
  { biome: "Boreal Needleleaf Taiga", percentage: 14, frpShare: 16, color: "#06b6d4" },
  { biome: "Temperate Conifer / Chaparral", percentage: 8, frpShare: 7, color: "#f97316" },
  { biome: "Peatlands & Wetlands", percentage: 6, frpShare: 4, color: "#a855f7" },
];

export default function HistoricalAnalysisPage() {
  const [selectedMetric, setSelectedMetric] = useState<"detections" | "carbon">("detections");

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Multi-Year Climatology"
        title="Historical Satellite Fire Archives (2018–2026)"
        description="Long-term multi-decadal fire trend synthesis comparing MODIS 1km historical baselines with high-resolution VIIRS 375m detection density."
      />

      {/* Main Multi-Year Chart */}
      <div className="rounded-xl glass-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              <h3 className="text-base font-semibold text-white">
                Global Annual Detection Frequency & Carbon Emissions
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Millions of active fire pixels detected annually by sensor constellation (Simulated Demo Archives)
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/8 text-xs">
            <button
              onClick={() => setSelectedMetric("detections")}
              className={`px-3 py-1 rounded font-medium transition-all ${
                selectedMetric === "detections"
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pixel Counts (Millions)
            </button>
            <button
              onClick={() => setSelectedMetric("carbon")}
              className={`px-3 py-1 rounded font-medium transition-all ${
                selectedMetric === "carbon"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Modeled Carbon (Tg CO₂)
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetric === "detections" ? (
              <BarChart
                data={ANNUAL_FIRE_HISTORY}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(val) => `${val}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar
                  dataKey="viirsCount"
                  name="VIIRS (375m) Total Detections (M)"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="modisCount"
                  name="MODIS (1km) Baseline Detections (M)"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart
                data={ANNUAL_FIRE_HISTORY}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(val) => `${val} Tg`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey="carbonTg"
                  name="Estimated Carbon Emissions (Teragrams CO₂)"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f97316" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            VIIRS captures ~2.4x to 2.8x more active fire pixels than MODIS due to 375m spatial resolution advantage.
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            GFED4s / NASA FIRMS MODELED PARITY
          </span>
        </div>
      </div>

      {/* Biome Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TreePine className="w-4 h-4 text-emerald-400" />
            <h4 className="font-semibold text-sm text-white">
              Historical Fire Distribution by Biome
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Average proportional breakdown of detected thermal anomalies across primary land cover classifications:
          </p>

          <div className="space-y-3 pt-2">
            {BIOME_IMPACT_HISTORY.map((biome) => (
              <div key={biome.biome} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{biome.biome}</span>
                  <span className="font-mono text-slate-400">
                    {biome.percentage}% Detections &bull; {biome.frpShare}% Total FRP
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${biome.percentage}%`,
                      backgroundColor: biome.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Climate Telemetry Correlations */}
        <div className="rounded-xl glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-cyan-400" />
            <h4 className="font-semibold text-sm text-white">
              Climatic Drivers & El Niño Southern Oscillation (ENSO)
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Satellite fire telemetry correlates strongly with tropical Pacific sea-surface temperature anomalies:
          </p>
          <div className="space-y-2.5 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
              <span className="font-semibold text-orange-400 block">El Niño Phase (e.g. 2019, 2023–2024):</span>
              <p className="text-slate-400">
                Severe drought across Amazonia, Southeast Asian peatlands, and eastern Australia sparks 30–50% spikes in fire count and catastrophic high-intensity smoke plumes.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
              <span className="font-semibold text-cyan-400 block">La Niña Phase (e.g. 2021–2022):</span>
              <p className="text-slate-400">
                Elevated precipitation depresses tropical fires but promotes fuel accumulation, subsequently priming savanna ecosystems for rapid burns during following dry seasons.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
