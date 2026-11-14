"use client";

import React from "react";
import { HotspotKpis } from "@/types/fire";

interface KpiCardsProps {
  kpis: HotspotKpis;
  isLive?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, isLive = false }) => {
  const isLiveActive = isLive || kpis.isLive || kpis.dataSource === "NASA_FIRMS_LIVE";

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Top Telemetry Header Bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-700">
            Constellation Telemetry Strip
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="font-mono text-[11px] text-slate-500">
            MODIS (1km) &bull; VIIRS (375m)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          {isLiveActive ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              NASA EOSDIS LANCE NRT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              SYNTHETIC DEMO BUFFER
            </span>
          )}

          <span className="text-slate-500 hidden sm:inline">
            Platforms: <strong className="text-slate-800">{kpis.detectedSatellites?.length ?? 5} Active</strong>
          </span>
        </div>
      </div>

      {/* Metric Tiles in Clean Horizontal Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* 1. Total Raw Observations */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-600">
              Raw Observations
            </span>
            <span className="text-[10px] font-mono text-slate-400">Total Pixels</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {kpis.totalHotspots.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>MODIS: {kpis.modisCount.toLocaleString()}</span>
            <span>&bull;</span>
            <span>VIIRS: {kpis.viirsCount.toLocaleString()}</span>
          </div>
        </div>

        {/* 2. VIIRS Detections (375m High-Resolution) */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-sky-700">
              VIIRS Detections
            </span>
            <span className="text-[10px] font-mono text-sky-600">375m Nadir</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-950 tracking-tight">
            {kpis.viirsCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            Suomi-NPP &bull; NOAA-20 &bull; NOAA-21
          </div>
        </div>

        {/* 3. MODIS Detections (1km Climate Baseline) */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-purple-700">
              MODIS Detections
            </span>
            <span className="text-[10px] font-mono text-purple-600">1000m Nadir</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-950 tracking-tight">
            {kpis.modisCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            Terra (AM) &bull; Aqua (PM) Baseline
          </div>
        </div>

        {/* 4. Harmonized Dual-Sensor Events */}
        <div className="p-3.5 sm:p-4 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-700">
              Harmonized Events
            </span>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200">
              Dual Pass
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {(kpis.harmonizedMatches ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono truncate">
            Engine: AgniNet-Harmonize-v1.1.1
          </div>
        </div>
      </div>

      {/* Scientific Clarification Footer */}
      <div className="px-4 py-1.5 bg-slate-100/60 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
        <span>NOTE: Active fire detections are radiometric thermal anomaly pixels, not confirmed ground wildfires.</span>
        <span>MODIS and VIIRS FRP values are maintained separately per physical sensor specifications.</span>
      </div>
    </div>
  );
};
