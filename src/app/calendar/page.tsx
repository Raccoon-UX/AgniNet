"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { fetchHistoricalCalendar } from "@/lib/api";
import { HistoricalCalendarResponse, HistoricalCalendarDay } from "@/types/fire";
import {
  Calendar as CalendarIcon,
  Flame,
  Sun,
  TrendingUp,
  RefreshCw,
  Database,
  ShieldCheck,
} from "lucide-react";

type PresetRange = "30D" | "90D" | "SEASON_2026" | "ALL";

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<HistoricalCalendarResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<HistoricalCalendarDay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetRange>("90D");

  const computeDatesForPreset = (p: PresetRange): { start?: string; end?: string } => {
    switch (p) {
      case "30D":
        return { start: "2026-10-15", end: "2026-11-14" };
      case "90D":
        return { start: "2026-08-15", end: "2026-11-14" };
      case "SEASON_2026":
        return { start: "2026-06-01", end: "2026-11-14" };
      case "ALL":
      default:
        return {};
    }
  };

  const loadData = useCallback(async (p: PresetRange) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = computeDatesForPreset(p);
      const res = await fetchHistoricalCalendar({ start_date: start, end_date: end });
      setCalendarData(res);
      if (res.days.length > 0) {
        // Select the last day with activity or the last day in array
        const lastDayWithData = [...res.days].reverse().find((d) => d.observation_count > 0) || res.days[res.days.length - 1];
        setSelectedDay(lastDayWithData);
      } else {
        setSelectedDay(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load historical fire calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      if (!ignore) {
        await loadData(preset);
      }
    }
    execute();
    return () => {
      ignore = true;
    };
  }, [preset, loadData]);

  const getDayColor = (intensity: number) => {
    if (intensity >= 85) return "bg-red-500 hover:ring-2 hover:ring-red-400";
    if (intensity >= 65) return "bg-orange-500 hover:ring-2 hover:ring-orange-400";
    if (intensity >= 40) return "bg-amber-500 hover:ring-2 hover:ring-amber-400";
    if (intensity >= 15) return "bg-yellow-500/80 hover:ring-2 hover:ring-yellow-300";
    if (intensity > 0) return "bg-emerald-600/70 hover:ring-2 hover:ring-emerald-400";
    return "bg-slate-800 text-slate-600 hover:bg-slate-700";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Temporal Fire Regime"
        title="Fire Activity Calendar & Seasonality Matrix"
        description="Daily fire occurrence index, seasonal burning cycles, and diurnal fire intensity metrics modeled from persistent historical satellite archives."
      />

      {/* Preset Controls & Provenance Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl glass-panel">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Range Presets:
          </span>
          <div className="flex items-center gap-1.5">
            {(["30D", "90D", "SEASON_2026", "ALL"] as PresetRange[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  preset === p
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {p === "SEASON_2026" ? "2026 Fire Season (Jun-Nov)" : p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {calendarData && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-cyan-300">
                {calendarData.data_source}
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="font-mono text-slate-300">
                {calendarData.total_days} Days ({calendarData.date_range_start} to {calendarData.date_range_end})
              </span>
            </div>
          )}

          <button
            onClick={() => loadData(preset)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            title="Reload Calendar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <span>Failed to fetch calendar telemetry: {error}</span>
          <button
            onClick={() => loadData(preset)}
            className="underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Heatmap Matrix Card */}
      <div className="rounded-xl glass-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h3 className="text-base font-semibold text-white">
                Daily Active Fire Thermal Severity Heatmap
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Normalized aggregate thermal severity across all active satellite passes (Scale: 0 - 100 Index relative to period max).
            </p>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Low (0)</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600/70" title="Low activity" />
              <span className="w-3.5 h-3.5 rounded bg-yellow-500/80" title="Moderate activity" />
              <span className="w-3.5 h-3.5 rounded bg-amber-500" title="Elevated activity" />
              <span className="w-3.5 h-3.5 rounded bg-orange-500" title="High activity" />
              <span className="w-3.5 h-3.5 rounded bg-red-500" title="Extreme activity" />
            </div>
            <span>Extreme (100)</span>
          </div>
        </div>

        {/* Loading Skeleton or Heatmap Grid */}
        {loading && !calendarData ? (
          <div className="py-20 text-center text-slate-400 animate-pulse text-sm">
            Retrieving persistent calendar matrix from SQLite archive...
          </div>
        ) : calendarData && calendarData.days.length > 0 ? (
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-14 gap-2">
            {calendarData.days.map((day) => {
              const isSelected = selectedDay?.date === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-orange-400 ring-2 ring-orange-500/40 bg-slate-800"
                      : "border-white/5 bg-slate-900/60 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">
                      {day.date.slice(5)}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${getDayColor(day.intensity_index)}`}
                      title={`Intensity: ${day.intensity_index}/100`}
                    />
                  </div>
                  <div className="mt-1.5 font-mono text-xs font-bold text-white">
                    {day.intensity_index}{" "}
                    <span className="text-[9px] font-normal text-slate-400">idx</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {day.observation_count.toLocaleString()} obs
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm">
            No historical records found for the requested date window.
          </div>
        )}

        {/* Selected Day Telemetry Highlight Bar */}
        {selectedDay && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-orange-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    Observation Date: {selectedDay.date}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase">
                    Dominant: {selectedDay.dominant_sensor}
                  </span>
                </div>
                <span className="text-base font-bold text-white">
                  Intensity Index {selectedDay.intensity_index} / 100 &bull;{" "}
                  {selectedDay.observation_count.toLocaleString()} Hotspots ({selectedDay.event_count} Events)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">DETECTIONS</span>
                <span className="text-slate-300">
                  <span className="text-cyan-400 font-semibold">{selectedDay.modis_count}</span> MODIS /{" "}
                  <span className="text-amber-400 font-semibold">{selectedDay.viirs_count}</span> VIIRS
                </span>
              </div>

              {/* Strict FRP Separation: MODIS vs VIIRS */}
              <div className="text-right border-l border-white/10 pl-4">
                <span className="text-slate-500 block text-[10px]">MODIS CUMULATIVE FRP</span>
                <span className="text-cyan-300 font-bold">
                  {selectedDay.modis_frp_mw != null
                    ? `${selectedDay.modis_frp_mw.toFixed(1)} MW`
                    : "0.0 MW"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">VIIRS CUMULATIVE FRP</span>
                <span className="text-amber-300 font-bold">
                  {selectedDay.viirs_frp_mw != null
                    ? `${selectedDay.viirs_frp_mw.toFixed(1)} MW`
                    : "0.0 MW"}
                </span>
              </div>

              {selectedDay.peak_frp_mw != null && (
                <div className="text-right border-l border-white/10 pl-4">
                  <span className="text-slate-500 block text-[10px]">PEAK SINGLE FRP</span>
                  <span className="text-red-400 font-bold">
                    {selectedDay.peak_frp_mw.toFixed(1)} MW
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FRP Separation Scientific Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-amber-200">
            Scientific Protocol: Independent Radiative Flux Accounting
          </p>
          <p className="text-slate-300 leading-relaxed">
            In compliance with NASA Earth Science and AgniNet Phase 4 standards, MODIS Fire Radiative Power (1 km footprint, 4.0 µm MIR band) and VIIRS Fire Radiative Power (375 m footprint, 3.74/4.05 µm I4/M13 bands) are aggregated and reported strictly separately. They represent fundamentally distinct point-spread functions and saturation radiances and must never be blended, averaged, or added together into a single sum.
          </p>
        </div>
      </div>

      {/* Diurnal Cycle & Seasonality Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diurnal Pattern Explainer */}
        <div className="p-5 rounded-xl glass-panel space-y-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h4 className="font-semibold text-sm text-white">
              Diurnal Burning Rhythm & Satellite Equator Crossings
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Wildfires exhibit strong diurnal variation, typically peaking in the early-to-mid afternoon when solar heating maximizes ambient temperature, drops relative humidity, and amplifies wind gusts.
          </p>
          <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-400">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Terra (MODIS AM):</span>
              <span className="font-mono text-cyan-300">10:30 LT Crossing &bull; Early ignition</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Aqua & VIIRS (PM):</span>
              <span className="font-mono text-orange-300">13:30 LT Crossing &bull; Peak convective intensity</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Nighttime Overpasses:</span>
              <span className="font-mono text-purple-300">01:30 LT Crossing &bull; Smoldering & peat burn</span>
            </div>
          </div>
        </div>

        {/* Global Seasonality Calendar Reference */}
        <div className="p-5 rounded-xl glass-panel space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <h4 className="font-semibold text-sm text-white">
              Hemispheric Fire Season Alignment
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Fire activity shifts seasonally between hemispheres following drought seasons and agricultural residue clearing schedules:
          </p>
          <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-400">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Amazon & Cerrado (S. America):</span>
              <span className="font-mono text-orange-400">Aug &ndash; Nov (Peak Dry Season)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">North America & Boreal:</span>
              <span className="font-mono text-amber-400">Jun &ndash; Sep (Summer Heatwaves)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Northern Australia Savanna:</span>
              <span className="font-mono text-yellow-400">Sep &ndash; Dec (Pre-Monsoon Dry)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60">
              <span className="text-slate-300">Sub-Saharan Africa:</span>
              <span className="font-mono text-cyan-400">Dec &ndash; Mar (Sahel) / Jun &ndash; Sep (Congo)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
