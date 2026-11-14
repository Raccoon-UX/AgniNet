"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  Flame,
  Globe2,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  fetchHistoricalEvents,
  fetchHistoricalRegions,
  fetchHistoricalSensors,
  fetchHistoricalSummary,
  fetchHistoricalTrends,
} from "@/lib/api";
import {
  HarmonizedEvent,
  HistoricalRegionStat,
  HistoricalSensorStat,
  HistoricalSummary,
  HistoricalTrendPoint,
} from "@/types/fire";

export default function HistoricalAnalysisPage() {
  // Query parameters state
  const [quickRange, setQuickRange] = useState<"30D" | "90D" | "SEASON_2026" | "ALL">("90D");
  const [startDate, setStartDate] = useState<string>("2026-06-01");
  const [endDate, setEndDate] = useState<string>("2026-11-14");
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState<"trends" | "frp" | "regions" | "sensors" | "events">("trends");
  const [classificationFilter, setClassificationFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data states
  const [summary, setSummary] = useState<HistoricalSummary | null>(null);
  const [trends, setTrends] = useState<HistoricalTrendPoint[]>([]);
  const [regions, setRegions] = useState<HistoricalRegionStat[]>([]);
  const [sensors, setSensors] = useState<HistoricalSensorStat[]>([]);
  const [events, setEvents] = useState<HarmonizedEvent[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalEvents, setTotalEvents] = useState<number>(0);

  // UI status states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick range helper
  const applyQuickRange = (range: "30D" | "90D" | "SEASON_2026" | "ALL") => {
    setQuickRange(range);
    setCurrentPage(1);
    if (range === "30D") {
      setStartDate("2026-10-15");
      setEndDate("2026-11-14");
      setGranularity("day");
    } else if (range === "90D") {
      setStartDate("2026-08-15");
      setEndDate("2026-11-14");
      setGranularity("week");
    } else if (range === "SEASON_2026") {
      setStartDate("2026-06-01");
      setEndDate("2026-11-14");
      setGranularity("week");
    } else {
      setStartDate("");
      setEndDate("");
      setGranularity("month");
    }
  };

  const loadHistoricalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qStart = startDate ? startDate : undefined;
      const qEnd = endDate ? endDate : undefined;

      const [sumRes, trRes, regRes, sensRes, evRes] = await Promise.all([
        fetchHistoricalSummary({ start_date: qStart, end_date: qEnd }),
        fetchHistoricalTrends({ start_date: qStart, end_date: qEnd, granularity }),
        fetchHistoricalRegions({ start_date: qStart, end_date: qEnd }),
        fetchHistoricalSensors({ start_date: qStart, end_date: qEnd }),
        fetchHistoricalEvents({
          start_date: qStart,
          end_date: qEnd,
          page: currentPage,
          page_size: 15,
          classification: classificationFilter === "ALL" ? undefined : classificationFilter,
        }),
      ]);

      setSummary(sumRes);
      setTrends(trRes.trends);
      setRegions(regRes.regions);
      setSensors(sensRes.sensors);
      setEvents(evRes.events);
      setTotalPages(evRes.total_pages);
      setTotalEvents(evRes.total_events);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, granularity, currentPage, classificationFilter]);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      if (!ignore) {
        await loadHistoricalData();
      }
    }
    execute();
    return () => {
      ignore = true;
    };
  }, [loadHistoricalData]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Multi-Temporal Fire Intelligence"
        title="Historical Active Fire Climatology & Analytics"
        description="Persistent multi-month and multi-annual satellite active fire synthesis harmonizing NASA EOS MODIS and JPSS VIIRS observations with strict radiative energy preservation."
      />

      {/* Control Strip & Query Filters */}
      <div className="rounded-xl glass-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 mr-1 font-mono uppercase text-[10px]">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              Range:
            </span>
            {(["30D", "90D", "SEASON_2026", "ALL"] as const).map((r) => (
              <button
                key={r}
                onClick={() => applyQuickRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                  quickRange === r
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20 border border-orange-400"
                    : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-white/5"
                }`}
              >
                {r === "30D" ? "Last 30 Days" : r === "90D" ? "Last 90 Days" : r === "SEASON_2026" ? "2026 Season" : "All Archives"}
              </button>
            ))}
          </div>

          {/* Granularity Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-white/5 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-mono px-2">Bin:</span>
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                  granularity === g
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => loadHistoricalData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/8 text-xs font-medium cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Date Inputs & Data Provenance Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Window:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickRange("ALL");
              }}
              className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 text-slate-200 text-xs font-mono"
            />
            <span className="text-slate-500">&rarr;</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickRange("ALL");
              }}
              className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 text-slate-200 text-xs font-mono"
            />
          </div>

          {summary && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                  summary.is_live
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : summary.data_source === "MIXED_HISTORICAL_ARCHIVE"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
                title={summary.provenance}
              >
                <Database className="w-3 h-3" />
                {summary.data_source}
              </span>
              <span className="text-slate-500">
                {summary.date_range_start} to {summary.date_range_end}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            Historical Archive Query Failed
          </div>
          <p>{error}</p>
          <button
            onClick={() => loadHistoricalData()}
            className="px-3 py-1 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30 cursor-pointer text-xs"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Unified Events</span>
            <span className="text-2xl font-bold font-mono text-white">{summary.total_events.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Harmonized clusters</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Raw Hotspots</span>
            <span className="text-2xl font-bold font-mono text-slate-200">{summary.total_observations.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">MODIS + VIIRS pixels</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] uppercase font-mono text-emerald-400 block">Dual-Matched</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{summary.matched_events.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-500/80 block">Cross-sensor verified</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-purple-500/20 space-y-1">
            <span className="text-[10px] uppercase font-mono text-purple-400 block">MODIS FRP</span>
            <span className="text-2xl font-bold font-mono text-purple-300">{summary.modis_frp_gigawatts} GW</span>
            <span className="text-[10px] text-purple-400/70 block">4.0&mu;m radiant power</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-1">
            <span className="text-[10px] uppercase font-mono text-cyan-400 block">VIIRS FRP</span>
            <span className="text-2xl font-bold font-mono text-cyan-300">{summary.viirs_frp_gigawatts} GW</span>
            <span className="text-[10px] text-cyan-400/70 block">3.74&mu;m radiant power</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-amber-500/20 space-y-1">
            <span className="text-[10px] uppercase font-mono text-amber-400 block">Peak Fire Day</span>
            <span className="text-base font-bold font-mono text-amber-200 truncate block">
              {summary.peak_day || "N/A"}
            </span>
            <span className="text-[10px] text-amber-400/70 block">{summary.peak_day_events} events</span>
          </div>
        </div>
      )}

      {/* Analytics Tabs Navigation */}
      <div className="flex border-b border-white/5 space-x-1 text-xs">
        {(
          [
            { id: "trends", label: "Temporal Activity Trends", icon: TrendingUp },
            { id: "frp", label: "Radiative Power Analysis (Separated)", icon: Zap },
            { id: "regions", label: "Regional Fire Regimes", icon: Globe2 },
            { id: "sensors", label: "Spacecraft Constellation", icon: Scale },
            { id: "events", label: `Harmonized Events (${totalEvents})`, icon: Sparkles },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-orange-500 text-orange-400 bg-orange-500/5 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Temporal Activity Trends */}
      {activeTab === "trends" && (
        <div className="rounded-xl glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                Harmonized Fire Events vs Raw Sensor Hotspots
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compares deduplicated unified event counts with raw MODIS + VIIRS observation density across {granularity} buckets.
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Aggregated across {trends.length} {granularity} intervals
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date_bucket" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="event_count" name="Unified Events" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="matched_count" name="Dual-Sensor Matches" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="observation_count" name="Raw Hotspots" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 2: Radiative Power Analysis (Separated) */}
      {activeTab === "frp" && (
        <div className="rounded-xl glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                Sensor-Separated Fire Radiative Power (MW)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict physical separation: MODIS 4.0&mu;m radiant power and VIIRS 3.74&mu;m radiant power rendered on independent curves (never summed).
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Cross-Sensor Non-Summation Enforced
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date_bucket" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey="modis_frp_mw"
                  name="MODIS FRP (1km MW)"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="viirs_frp_mw"
                  name="VIIRS FRP (375m MW)"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 3: Regional Fire Regimes */}
      {activeTab === "regions" && (
        <div className="rounded-xl glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-orange-400" />
                Regional Hotspot Density & Biome Energy Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated event frequencies and sensor radiative power across global wildfire biomes.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {regions.length} active regions identified
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold font-mono">
                  <th className="py-2.5 px-3">Biome / Region Name</th>
                  <th className="py-2.5 px-3">Unified Events</th>
                  <th className="py-2.5 px-3">Dual-Matched</th>
                  <th className="py-2.5 px-3">Share (%)</th>
                  <th className="py-2.5 px-3">MODIS FRP (MW)</th>
                  <th className="py-2.5 px-3">VIIRS FRP (MW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {regions.map((reg) => (
                  <tr key={reg.region_name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {reg.region_name}
                    </td>
                    <td className="py-3 px-3 font-mono text-orange-400 font-bold">
                      {reg.event_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-300">
                      {reg.matched_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, reg.percentage_of_total)}%` }} />
                        </div>
                        <span>{reg.percentage_of_total}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-300">
                      {reg.modis_frp_mw.toLocaleString()} MW
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300">
                      {reg.viirs_frp_mw.toLocaleString()} MW
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Spacecraft Constellation */}
      {activeTab === "sensors" && (
        <div className="rounded-xl glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-orange-400" />
                Spacecraft Constellation & Radiometric Performance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detection volumes, diurnal sampling (Day vs Night), and radiometric statistics by satellite platform.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {sensors.length} operational spacecraft
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold font-mono">
                  <th className="py-2.5 px-3">Spacecraft</th>
                  <th className="py-2.5 px-3">Instrument</th>
                  <th className="py-2.5 px-3">Hotspots</th>
                  <th className="py-2.5 px-3">Share</th>
                  <th className="py-2.5 px-3">Day / Night</th>
                  <th className="py-2.5 px-3">Total FRP</th>
                  <th className="py-2.5 px-3">Mean FRP</th>
                  <th className="py-2.5 px-3">Max FRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {sensors.map((s) => (
                  <tr key={s.satellite} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      {s.satellite}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        s.instrument === "MODIS"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {s.instrument}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200 font-bold">
                      {s.observation_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {s.share_percentage}%
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      <span className="text-amber-400">{s.daytime_count} D</span> &bull; <span className="text-cyan-400">{s.nighttime_count} N</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-orange-400 font-bold">
                      {s.total_frp_mw.toLocaleString()} MW
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {s.mean_frp_mw !== null ? `${s.mean_frp_mw} MW` : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-red-400 font-bold">
                      {s.max_frp_mw !== null ? `${s.max_frp_mw} MW` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Paginated Harmonized Events Table */}
      {activeTab === "events" && (
        <div className="rounded-xl glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Persisted Unified Harmonized Fire Events
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Harmonized via AgniNet-Harmonize-v1.1.1. Showing page {currentPage} of {totalPages} ({totalEvents} total events).
              </p>
            </div>

            {/* Classification Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["ALL", "MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => {
                    setClassificationFilter(cls);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    classificationFilter === cls
                      ? "bg-orange-500 text-white border border-orange-400"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-white/5"
                  }`}
                >
                  {cls === "ALL" ? "All" : cls.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold font-mono">
                  <th className="py-2.5 px-3">Event ID & Classification</th>
                  <th className="py-2.5 px-3">Date & Time (UTC)</th>
                  <th className="py-2.5 px-3">Centroid (WGS84)</th>
                  <th className="py-2.5 px-3">Platforms</th>
                  <th className="py-2.5 px-3">MODIS FRP</th>
                  <th className="py-2.5 px-3">VIIRS FRP</th>
                  <th className="py-2.5 px-3">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {events.map((evt) => {
                  const badgeClass =
                    evt.classification === "MATCHED"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : evt.classification === "MODIS_ONLY"
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : evt.classification === "VIIRS_ONLY"
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30";

                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono text-xs font-semibold text-slate-200">
                          {evt.id}
                        </div>
                        <span className={`inline-block px-1.5 py-0.2 mt-1 rounded text-[9px] font-mono font-bold border ${badgeClass}`}>
                          {evt.classification.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {evt.acquisition_date}
                        <div className="text-[10px] text-slate-500">
                          {evt.earliest_acq_utc ?? "—"} to {evt.latest_acq_utc ?? "—"} UTC
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {evt.latitude >= 0 ? `${evt.latitude.toFixed(2)}°N` : `${Math.abs(evt.latitude).toFixed(2)}°S`},{" "}
                        {evt.longitude >= 0 ? `${evt.longitude.toFixed(2)}°E` : `${Math.abs(evt.longitude).toFixed(2)}°W`}
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        {[...evt.modis_satellites, ...evt.viirs_satellites].join(", ") || "Unassigned"}
                        <div className="text-[10px] text-slate-500 font-mono">
                          {evt.modis_observation_ids.length} MODIS &bull; {evt.viirs_observation_ids.length} VIIRS
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-purple-300">
                        {evt.modis_frp_mw !== null && evt.modis_frp_mw !== undefined ? `${evt.modis_frp_mw} MW` : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-300">
                        {evt.viirs_total_frp_mw !== null && evt.viirs_total_frp_mw !== undefined
                          ? `${evt.viirs_total_frp_mw} MW`
                          : evt.viirs_individual_frps.length > 0
                          ? `[${evt.viirs_individual_frps.map((f) => `${f.toFixed(1)}`).join(", ")}] MW`
                          : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-200">
                        {Math.round(evt.match_score * 100)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
