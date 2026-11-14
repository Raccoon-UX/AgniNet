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
  Globe2,
  RefreshCw,
  Scale,
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
          classification: classificationFilter !== "ALL" ? classificationFilter : undefined,
          page: currentPage,
          page_size: 20,
        }),
      ]);

      setSummary(sumRes);
      setTrends(trRes.trends);
      setRegions(regRes.regions);
      setSensors(sensRes.sensors);
      setEvents(evRes.events);
      setTotalPages(evRes.total_pages);
      setTotalEvents(evRes.total_events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load historical analytics.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, granularity, classificationFilter, currentPage]);

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
      {/* Page Header */}
      <PageHeader
        badge="Historical Analytics / Temporal Archive"
        title="Historical Satellite Fire Intelligence"
        description="Multi-temporal activity trends, cross-sensor FRP separation, and regional biome fire regimes modeled from persistent satellite archives."
        action={
          <button
            onClick={() => loadHistoricalData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-900" : ""}`} />
            <span>Refresh Archive</span>
          </button>
        }
      />

      {/* Query Filter and Window Controls */}
      <div className="sci-card p-4 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Range Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Interval:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
              {(["30D", "90D", "SEASON_2026", "ALL"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => applyQuickRange(r)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    quickRange === r
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r === "SEASON_2026" ? "2026 Season" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Granularity Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Binning:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
              {(["day", "week", "month"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium uppercase transition-colors cursor-pointer ${
                    granularity === g
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Inputs & Data Provenance Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Date Window:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickRange("ALL");
              }}
              className="px-2 py-1 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono"
            />
            <span className="text-slate-400">&rarr;</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickRange("ALL");
              }}
              className="px-2 py-1 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono"
            />
          </div>

          {summary && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                  summary.is_live
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : summary.data_source === "MIXED_HISTORICAL_ARCHIVE"
                    ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
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
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <span>Failed to query historical archive: {error}</span>
          <button
            onClick={() => loadHistoricalData()}
            className="underline hover:text-red-900 font-medium cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Unified Events</span>
            <span className="text-2xl font-bold font-mono text-slate-900">{summary.total_events.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block">Harmonized clusters</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Raw Hotspots</span>
            <span className="text-2xl font-bold font-mono text-slate-800">{summary.total_observations.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block">MODIS + VIIRS pixels</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-emerald-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-mono text-emerald-700 block">Dual-Matched</span>
            <span className="text-2xl font-bold font-mono text-emerald-800">{summary.matched_events.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 block">Cross-sensor verified</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-purple-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-mono text-purple-700 block">MODIS FRP</span>
            <span className="text-2xl font-bold font-mono text-purple-900">{summary.modis_frp_gigawatts} GW</span>
            <span className="text-[10px] text-purple-600 block">4.0&mu;m radiant power</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-sky-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-mono text-sky-700 block">VIIRS FRP</span>
            <span className="text-2xl font-bold font-mono text-sky-900">{summary.viirs_frp_gigawatts} GW</span>
            <span className="text-[10px] text-sky-600 block">3.74&mu;m radiant power</span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-amber-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-mono text-amber-700 block">Peak Fire Day</span>
            <span className="text-base font-bold font-mono text-amber-900 truncate block">
              {summary.peak_day || "N/A"}
            </span>
            <span className="text-[10px] text-amber-600 block">{summary.peak_day_events} events</span>
          </div>
        </div>
      )}

      {/* Analytics Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-1 text-xs">
        {(
          [
            { id: "trends", label: "Temporal Activity Trends", icon: TrendingUp },
            { id: "frp", label: "Radiative Power Analysis (Separated)", icon: Zap },
            { id: "regions", label: "Regional Fire Regimes", icon: Globe2 },
            { id: "sensors", label: "Spacecraft Constellation", icon: Scale },
            { id: "events", label: `Harmonized Events (${totalEvents})`, icon: BarChart3 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
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
        <div className="sci-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                Harmonized Fire Events vs Raw Sensor Hotspots
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date_bucket" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "6px",
                    color: "#0f172a",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px", fontFamily: "monospace" }} />
                <Bar dataKey="event_count" name="Unified Events" fill="#ea580c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="matched_count" name="Dual-Sensor Matches" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="observation_count" name="Raw Hotspots" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 2: Radiative Power Analysis (Separated) */}
      {activeTab === "frp" && (
        <div className="sci-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-700" />
                Sensor-Separated Fire Radiative Power (MW)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict physical separation: MODIS 4.0&mu;m radiant power and VIIRS 3.74&mu;m radiant power rendered on independent curves (never summed).
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
              Cross-Sensor Non-Summation Enforced
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date_bucket" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "6px",
                    color: "#0f172a",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px", fontFamily: "monospace" }} />
                <Line
                  type="monotone"
                  dataKey="modis_frp_mw"
                  name="MODIS FRP (1km MW)"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="viirs_frp_mw"
                  name="VIIRS FRP (375m MW)"
                  stroke="#0284c7"
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
        <div className="sci-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-slate-700" />
                Regional Hotspot Density & Biome Energy Distribution
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated event frequencies and sensor radiative power across global wildfire biomes.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {regions.length} active regions identified
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold font-mono">
                  <th className="py-2.5 px-3">Biome / Region Name</th>
                  <th className="py-2.5 px-3">Unified Events</th>
                  <th className="py-2.5 px-3">Dual-Matched</th>
                  <th className="py-2.5 px-3">Share (%)</th>
                  <th className="py-2.5 px-3">MODIS FRP (MW)</th>
                  <th className="py-2.5 px-3">VIIRS FRP (MW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {regions.map((reg) => (
                  <tr key={reg.region_name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-900 font-sans">
                      {reg.region_name}
                    </td>
                    <td className="py-2.5 px-3 text-orange-700 font-bold">
                      {reg.event_count.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-700">
                      {reg.matched_count.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-slate-800 rounded-full" style={{ width: `${Math.min(100, reg.percentage_of_total)}%` }} />
                        </div>
                        <span>{reg.percentage_of_total}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-purple-800">
                      {reg.modis_frp_mw.toLocaleString()} MW
                    </td>
                    <td className="py-2.5 px-3 text-sky-800">
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
        <div className="sci-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-slate-700" />
                Spacecraft Constellation & Radiometric Performance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Detection volumes, diurnal sampling (Day vs Night), and radiometric statistics by satellite platform.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {sensors.length} operational spacecraft
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold font-mono">
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
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {sensors.map((s) => (
                  <tr key={s.satellite} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">
                      {s.satellite}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        s.instrument === "MODIS"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-sky-50 text-sky-800 border border-sky-200"
                      }`}>
                        {s.instrument}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 font-bold">
                      {s.observation_count.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {s.share_percentage}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span>{s.daytime_count} D</span> &bull; <span>{s.nighttime_count} N</span>
                    </td>
                    <td className="py-2.5 px-3 text-orange-700 font-bold">
                      {s.total_frp_mw.toLocaleString()} MW
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {s.mean_frp_mw !== null ? `${s.mean_frp_mw} MW` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-red-700 font-bold">
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
        <div className="sci-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                Persisted Unified Harmonized Fire Events
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Harmonized via AgniNet-Harmonize-v1.1.1. Showing page {currentPage} of {totalPages} ({totalEvents} total events).
              </p>
            </div>

            {/* Classification Filters */}
            <div className="flex flex-wrap items-center gap-1">
              {(["ALL", "MATCHED", "MODIS_ONLY", "VIIRS_ONLY", "AMBIGUOUS"] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => {
                    setClassificationFilter(cls);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    classificationFilter === cls
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cls === "ALL" ? "All" : cls.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold font-mono">
                  <th className="py-2.5 px-3">Event ID & Classification</th>
                  <th className="py-2.5 px-3">Date & Time (UTC)</th>
                  <th className="py-2.5 px-3">Centroid (WGS84)</th>
                  <th className="py-2.5 px-3">Platforms</th>
                  <th className="py-2.5 px-3">MODIS FRP</th>
                  <th className="py-2.5 px-3">VIIRS FRP</th>
                  <th className="py-2.5 px-3">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {events.map((evt) => {
                  const badgeClass =
                    evt.classification === "MATCHED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : evt.classification === "MODIS_ONLY"
                      ? "bg-purple-50 text-purple-800 border-purple-200"
                      : evt.classification === "VIIRS_ONLY"
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : "bg-amber-50 text-amber-800 border-amber-200";

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">
                          {evt.id}
                        </div>
                        <span className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-semibold border ${badgeClass}`}>
                          {evt.classification.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {evt.acquisition_date}
                        <div className="text-[10px] text-slate-400">
                          {evt.earliest_acq_utc ?? "—"} to {evt.latest_acq_utc ?? "—"} UTC
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {evt.latitude >= 0 ? `${evt.latitude.toFixed(2)}°N` : `${Math.abs(evt.latitude).toFixed(2)}°S`},{" "}
                        {evt.longitude >= 0 ? `${evt.longitude.toFixed(2)}°E` : `${Math.abs(evt.longitude).toFixed(2)}°W`}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {[...evt.modis_satellites, ...evt.viirs_satellites].join(", ") || "Unassigned"}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {evt.modis_observation_ids.length} MODIS &bull; {evt.viirs_observation_ids.length} VIIRS
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-purple-800 font-bold">
                        {evt.modis_frp_mw !== null && evt.modis_frp_mw !== undefined ? `${evt.modis_frp_mw} MW` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-sky-800 font-bold">
                        {evt.viirs_total_frp_mw !== null && evt.viirs_total_frp_mw !== undefined
                          ? `${evt.viirs_total_frp_mw} MW`
                          : evt.viirs_individual_frps.length > 0
                          ? `[${evt.viirs_individual_frps.map((f) => `${f.toFixed(1)}`).join(", ")}] MW`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {Math.round(evt.match_score * 100)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-600 font-mono">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
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
