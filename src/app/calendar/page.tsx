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
    if (intensity >= 85) return "bg-red-600 text-white";
    if (intensity >= 65) return "bg-orange-500 text-white";
    if (intensity >= 40) return "bg-amber-400 text-slate-900";
    if (intensity >= 15) return "bg-yellow-200 text-slate-900";
    if (intensity > 0) return "bg-emerald-100 text-emerald-900";
    return "bg-slate-100 text-slate-400";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        badge="Temporal Fire Regime / Seasonality Matrix"
        title="Fire Activity Calendar"
        description="Daily sensor-normalized comparative fire activity index, seasonal burning cycles, and diurnal fire rhythms modeled from persistent satellite archives."
      />

      {/* Preset Controls & Provenance Banner */}
      <div className="sci-card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
            Range Presets:
          </span>
          <div className="flex items-center gap-1.5">
            {(["30D", "90D", "SEASON_2026", "ALL"] as PresetRange[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  preset === p
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {p === "SEASON_2026" ? "2026 Season (Jun-Nov)" : p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {calendarData && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  calendarData.is_live
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : calendarData.data_source === "MIXED_HISTORICAL_ARCHIVE"
                    ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
                title={calendarData.provenance}
              >
                <Database className="w-3 h-3" />
                {calendarData.data_source}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600">
                {calendarData.total_days} Days ({calendarData.date_range_start} to {calendarData.date_range_end})
              </span>
            </div>
          )}

          <button
            onClick={() => loadData(preset)}
            disabled={loading}
            className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 disabled:opacity-50 transition-colors cursor-pointer"
            title="Reload Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-900" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <span>Failed to fetch calendar telemetry: {error}</span>
          <button
            onClick={() => loadData(preset)}
            className="underline hover:text-red-900 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Heatmap Matrix Card */}
      <div className="sci-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Daily Sensor-Normalized Comparative Fire Activity Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dimensionless sensor-normalized comparative activity index (0 - 100). Normalization is relative to peak activity within the selected period and does not represent absolute physical energy or cross-sensor combined FRP.
            </p>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Low (0)</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" title="Low activity" />
              <span className="w-3.5 h-3.5 rounded bg-yellow-200 border border-yellow-300" title="Moderate activity" />
              <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500" title="Elevated activity" />
              <span className="w-3.5 h-3.5 rounded bg-orange-500 border border-orange-600" title="High activity" />
              <span className="w-3.5 h-3.5 rounded bg-red-600 border border-red-700" title="Severe activity" />
            </div>
            <span>Severe (100)</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        {loading && !calendarData ? (
          <div className="py-16 text-center text-slate-500 text-xs font-mono">
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
                  className={`p-2 rounded-md border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-slate-900 ring-2 ring-slate-900/20 bg-slate-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500">
                      {day.date.slice(5)}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${getDayColor(day.intensity_index)}`}
                      title={`Intensity: ${day.intensity_index}/100`}
                    />
                  </div>
                  <div className="mt-1 font-mono text-xs font-bold text-slate-900">
                    {day.intensity_index}{" "}
                    <span className="text-[9px] font-normal text-slate-500">idx</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {day.observation_count.toLocaleString()} obs
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            No historical records found for the requested date window.
          </div>
        )}

        {/* Selected Day Telemetry Highlight Bar */}
        {selectedDay && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-300 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-mono">
                    Observation Date: {selectedDay.date}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 text-slate-800 uppercase">
                    Dominant: {selectedDay.dominant_sensor}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  Intensity Index {selectedDay.intensity_index} / 100 &bull;{" "}
                  {selectedDay.observation_count.toLocaleString()} Hotspots ({selectedDay.event_count} Events)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">DETECTIONS</span>
                <span className="text-slate-800 font-semibold">
                  <span className="text-purple-700">{selectedDay.modis_count}</span> MODIS /{" "}
                  <span className="text-sky-700">{selectedDay.viirs_count}</span> VIIRS
                </span>
              </div>

              {/* Strict FRP Separation: MODIS vs VIIRS */}
              <div className="text-right border-l border-slate-200 pl-4">
                <span className="text-slate-500 block text-[10px]">MODIS CUMULATIVE FRP</span>
                <span className="text-purple-800 font-bold">
                  {selectedDay.modis_frp_mw != null
                    ? `${selectedDay.modis_frp_mw.toFixed(1)} MW`
                    : "0.0 MW"}
                </span>
              </div>

              <div className="text-right border-l border-slate-200 pl-4">
                <span className="text-slate-500 block text-[10px]">VIIRS CUMULATIVE FRP</span>
                <span className="text-sky-800 font-bold">
                  {selectedDay.viirs_frp_mw != null
                    ? `${selectedDay.viirs_frp_mw.toFixed(1)} MW`
                    : "0.0 MW"}
                </span>
              </div>

              {selectedDay.peak_frp_mw != null && (
                <div className="text-right border-l border-slate-200 pl-4">
                  <span className="text-slate-500 block text-[10px]">PEAK SINGLE FRP</span>
                  <span className="text-red-700 font-bold">
                    {selectedDay.peak_frp_mw.toFixed(1)} MW
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FRP Separation Scientific Disclaimer */}
      <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-amber-900">
            Scientific Protocol: Independent Radiative Flux Accounting
          </p>
          <p className="text-amber-800 leading-relaxed">
            In compliance with NASA Earth Science and AgniNet Phase 4 standards, MODIS Fire Radiative Power (1 km footprint, 4.0 µm MIR band) and VIIRS Fire Radiative Power (375 m footprint, 3.74/4.05 µm I4/M13 bands) are aggregated and reported strictly separately. They represent fundamentally distinct point-spread functions and saturation radiances and must never be blended, averaged, or added together into a single sum.
          </p>
        </div>
      </div>

      {/* Diurnal Cycle & Seasonality Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diurnal Pattern Explainer */}
        <div className="sci-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-600" />
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-900">
              Diurnal Burning Rhythm & Orbit Equator Crossings
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Wildfires exhibit strong diurnal variation, typically peaking in early-to-mid afternoon when solar radiation maximizes ambient temperatures, depresses fuel moisture, and increases convective wind gusts.
          </p>
          <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Terra (MODIS AM):</span>
              <span className="text-slate-900 font-semibold">10:30 LT Crossing &bull; Morning baseline</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Aqua & VIIRS (PM):</span>
              <span className="text-orange-700 font-semibold">13:30 LT Crossing &bull; Peak convective intensity</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Nighttime Overpasses:</span>
              <span className="text-purple-700 font-semibold">01:30 LT Crossing &bull; Smoldering combustion</span>
            </div>
          </div>
        </div>

        {/* Global Seasonality Calendar Reference */}
        <div className="sci-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-900">
              Hemispheric Fire Season Alignment
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fire activity shifts seasonally between hemispheres following dry seasons, drought cycles, and agricultural burn regimes:
          </p>
          <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Amazon & Cerrado (S. America):</span>
              <span className="text-orange-700 font-semibold">Aug &ndash; Nov (Peak Dry Season)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Western US & Boreal:</span>
              <span className="text-amber-700 font-semibold">Jun &ndash; Sep (Summer Heatwaves)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Northern Australia Savanna:</span>
              <span className="text-amber-700 font-semibold">Sep &ndash; Dec (Pre-Monsoon Dry)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Sub-Saharan Africa:</span>
              <span className="text-sky-700 font-semibold">Dec &ndash; Mar (Sahel) / Jun &ndash; Sep (Congo)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
