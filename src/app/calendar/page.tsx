"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DEMO_CALENDAR_HEATMAP } from "@/data/fixtures";
import { Calendar as CalendarIcon, Flame, Sun, TrendingUp } from "lucide-react";

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(DEMO_CALENDAR_HEATMAP[DEMO_CALENDAR_HEATMAP.length - 1]);

  const getDayColor = (intensity: number) => {
    if (intensity >= 85) return "bg-red-500 hover:ring-2 hover:ring-red-400";
    if (intensity >= 70) return "bg-orange-500 hover:ring-2 hover:ring-orange-400";
    if (intensity >= 55) return "bg-amber-500 hover:ring-2 hover:ring-amber-400";
    return "bg-yellow-500/80 hover:ring-2 hover:ring-yellow-300";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Temporal Fire Regime"
        title="Fire Activity Calendar & Seasonality Matrix"
        description="Daily fire occurrence index, seasonal burning cycles, and diurnal fire intensity metrics modeled across global biomes."
      />

      {/* Heatmap Matrix Card */}
      <div className="rounded-xl glass-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-orange-400" />
              <h3 className="text-base font-semibold text-white">
                30-Day Global Active Fire Intensity Index
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Normalized aggregate thermal severity across all active satellite passes (Oct 15 - Nov 14, 2026)
            </p>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Low</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-yellow-500/80" />
              <span className="w-3.5 h-3.5 rounded bg-amber-500" />
              <span className="w-3.5 h-3.5 rounded bg-orange-500" />
              <span className="w-3.5 h-3.5 rounded bg-red-500" />
            </div>
            <span>Extreme</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2.5">
          {DEMO_CALENDAR_HEATMAP.map((day) => {
            const isSelected = selectedDay.date === day.date;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
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
                    className={`w-2.5 h-2.5 rounded-full ${getDayColor(day.intensity)}`}
                  />
                </div>
                <div className="mt-2 font-mono text-xs font-bold text-white">
                  {day.intensity} <span className="text-[9px] font-normal text-slate-400">idx</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {(day.count / 1000).toFixed(1)}k fires
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Telemetry Highlight Bar */}
        {selectedDay && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-orange-500/25 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-mono">
                  Observation Date: {selectedDay.date}
                </span>
                <span className="text-base font-bold text-white">
                  Intensity Index {selectedDay.intensity} / 100 &bull; {selectedDay.count.toLocaleString()} Hotspots
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">ESTIMATED FRP</span>
                <span className="text-orange-300 font-bold">
                  {((selectedDay.count * 26.5) / 1000).toFixed(1)} GW
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">PEAK WINDOW</span>
                <span className="text-cyan-400 font-bold">13:30 - 15:00 UTC</span>
              </div>
            </div>
          </div>
        )}
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
