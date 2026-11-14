"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { fetchHistoricalTrends } from "@/lib/api";
import { HistoricalTrendPoint } from "@/types/fire";
import { BarChart2, RotateCcw, AlertCircle } from "lucide-react";

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
          {label} Interval
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

interface ActivityTrendChartProps {
  isDemo?: boolean;
}

export const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ isDemo = false }) => {
  const [metricView, setMetricView] = useState<"detections" | "harmonized">("detections");
  const [apiTrends, setApiTrends] = useState<HistoricalTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    async function loadTrends() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchHistoricalTrends({ granularity: "day" });
        if (!ignore) {
          if (res && res.trends && res.trends.length > 0) {
            setApiTrends(res.trends);
            setIsLive(res.is_live);
          } else {
            setApiTrends([]);
            setIsLive(res ? res.is_live : false);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setApiTrends([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTrends();
    return () => {
      ignore = true;
    };
  }, []);

  const hasApiData = apiTrends.length > 0;

  const chartData = useMemo(() => {
    if (hasApiData) {
      return apiTrends.map((pt) => ({
        time: pt.date_bucket.length > 5 ? pt.date_bucket.slice(5) : pt.date_bucket,
        viirsHotspots: pt.viirs_only_count + pt.matched_count,
        modisHotspots: pt.modis_only_count + pt.matched_count,
        harmonizedMatches: pt.matched_count,
        total: pt.observation_count,
      }));
    }
    // Only fall back to synthetic benchmark data when isDemo is explicitly true
    if (isDemo) {
      return DEMO_TREND_DATA.map((pt) => ({
        time: pt.timeLabel,
        viirsHotspots: pt.viirsDetections,
        modisHotspots: pt.modisDetections,
        harmonizedMatches: pt.harmonizedMatches,
        total: pt.viirsDetections + pt.modisDetections,
      }));
    }
    return [];
  }, [apiTrends, hasApiData, isDemo]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Diurnal Detection Trend
            </h3>
            {/* Provenance Badge */}
            {hasApiData ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  isLive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-600" : "bg-indigo-600"}`} />
                {isLive ? "NASA FIRMS LIVE ARCHIVE" : "HISTORICAL DATABASE"}
              </span>
            ) : isDemo ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                SYNTHETIC BENCHMARK
              </span>
            ) : error ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-50 text-red-800 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                TREND FEED OFFLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                EMPTY ARCHIVE
              </span>
            )}
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

      {/* Chart Canvas or Fallback States */}
      {loading ? (
        <div className="h-64 w-full flex items-center justify-center text-xs font-mono text-slate-500 gap-2 border border-dashed border-slate-200 rounded-md">
          <RotateCcw className="w-4 h-4 animate-spin text-orange-400" />
          <span>Retrieving observation trend timeseries...</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 w-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-md space-y-2">
          <AlertCircle className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">
            {error ? "Trend Service Unavailable" : "No Historical Trend Observations"}
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm">
            {error
              ? `Failed to communicate with trends API (${error}). Synthetic trends are not rendered in live mode.`
              : "No fire observations were recorded in the active database for this period."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {isDemo && !hasApiData && (
            <div className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              <span>NOTE: Displaying synthetic benchmark curve. Live database records not detected.</span>
            </div>
          )}

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
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
                    dataKey="harmonizedMatches"
                    name="Harmonized Dual Matches"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHarm)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
