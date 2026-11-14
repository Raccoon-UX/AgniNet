"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DEMO_TREND_DATA } from "@/data/fixtures";
import { Activity, Flame, Zap } from "lucide-react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg p-3 glass-panel-elevated shadow-xl border border-white/10 text-xs">
        <p className="font-mono font-semibold text-slate-200 border-b border-white/10 pb-1.5 mb-2">
          {label} (Simulated Orbit Window)
        </p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-white">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>DATA SOURCE</span>
          <span className="text-orange-400">DEMO HARMONIZED BUFFER</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ActivityTrendChart: React.FC = () => {
  const [metricMode, setMetricMode] = useState<"detections" | "frp">("detections");

  return (
    <div className="rounded-xl glass-panel p-5 flex flex-col space-y-4">
      {/* Header with Metric Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-semibold text-white">
              Diurnal Fire Radiative & Detection Trajectory
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hourly sensor count breakdown: VIIRS 375m vs MODIS 1km vs Harmonized Fusion
          </p>
        </div>

        {/* Toggle between Detections vs FRP MW */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/8 shrink-0">
          <button
            onClick={() => setMetricMode("detections")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              metricMode === "detections"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Detections Count
          </button>
          <button
            onClick={() => setMetricMode("frp")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              metricMode === "frp"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Radiative Power (MW)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === "detections" ? (
            <AreaChart
              data={DEMO_TREND_DATA}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorViirs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorModis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorHarmonized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
              <Area
                type="monotone"
                dataKey="viirsDetections"
                name="VIIRS (375m)"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViirs)"
              />
              <Area
                type="monotone"
                dataKey="modisDetections"
                name="MODIS (1000m)"
                stroke="#a855f7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorModis)"
              />
              <Area
                type="monotone"
                dataKey="harmonizedMatches"
                name="Harmonized Cross-Matches"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorHarmonized)"
              />
            </AreaChart>
          ) : (
            <AreaChart
              data={DEMO_TREND_DATA}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorFrp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="totalFrpMw"
                name="Total Fire Radiative Power (MW)"
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorFrp)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Trajectory Insights Footer */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Peak burning window detected at 14:00 UTC (Amazon & Central Africa afternoon pass)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <Flame className="w-3 h-3 text-orange-500" />
          <span>SIMULATED DIURNAL FIRE CYCLE</span>
        </div>
      </div>
    </div>
  );
};
