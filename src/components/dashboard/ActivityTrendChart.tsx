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
import { BarChart2 } from "lucide-react";

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
      <div className="bg-white border border-slate-300 rounded-md p-3 shadow-md text-xs">
        <p className="font-mono font-semibold text-slate-800 border-b border-slate-200 pb-1 mb-2">
          {label} UTC Orbit Window
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 font-mono">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold text-slate-900">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const ActivityTrendChart: React.FC = () => {
  const [metricView, setMetricView] = useState<"detections" | "harmonized">("detections");

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Orbital Pass Telemetry Trends
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Diurnal active thermal anomaly detections separated by sensor platform
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
          <button
            onClick={() => setMetricView("detections")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              metricView === "detections"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sensor Comparison
          </button>
          <button
            onClick={() => setMetricView("harmonized")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              metricView === "harmonized"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Harmonized Pairs
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={DEMO_TREND_DATA}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorViirs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorModis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHarm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
            />

            <Tooltip content={<CustomChartTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontFamily: "monospace" }}
            />

            {metricView === "detections" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="viirsHotspots"
                  name="VIIRS (375m)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViirs)"
                />
                <Area
                  type="monotone"
                  dataKey="modisHotspots"
                  name="MODIS (1km)"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorModis)"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="harmonizedEvents"
                name="Harmonized Dual Events"
                stroke="#4f46e5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHarm)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>RESOLUTION: MODIS (1km nadir) &bull; VIIRS (375m nadir)</span>
        <span>SYNTHETIC HOURLY BUFFER</span>
      </div>
    </div>
  );
};
