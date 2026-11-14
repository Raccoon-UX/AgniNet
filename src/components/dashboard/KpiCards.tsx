"use client";

import React from "react";
import { HotspotKpis } from "@/types/fire";
import { Flame, Radio, Satellite, Layers, Info } from "lucide-react";

interface KpiCardsProps {
  kpis: HotspotKpis;
  isLive?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Total Observations */}
      <div className="sci-card p-3.5 flex items-start gap-3 bg-white">
        <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">
            Total Observations
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 tracking-tight mt-0.5">
            {kpis.totalHotspots.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <span>fire pixels</span>
            <span
              title="Individual satellite thermal anomaly pixels across constellation"
              className="cursor-help"
            >
              ⓘ
            </span>
          </div>
        </div>
      </div>

      {/* 2. VIIRS Detections */}
      <div className="sci-card p-3.5 flex items-start gap-3 bg-white">
        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 text-sky-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">
            VIIRS Detections
          </span>
          <div className="text-xl font-bold font-mono text-sky-950 tracking-tight mt-0.5">
            {kpis.viirsCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-sky-600 font-mono mt-0.5 font-medium">
            (375 m)
          </div>
        </div>
      </div>

      {/* 3. MODIS Detections */}
      <div className="sci-card p-3.5 flex items-start gap-3 bg-white">
        <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0">
          <Satellite className="w-4 h-4 text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">
            MODIS Detections
          </span>
          <div className="text-xl font-bold font-mono text-purple-950 tracking-tight mt-0.5">
            {kpis.modisCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-600 font-mono mt-0.5 font-medium">
            (1 km)
          </div>
        </div>
      </div>

      {/* 4. Harmonized Events */}
      <div className="sci-card p-3.5 flex items-start gap-3 bg-white">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">
            Harmonized Events
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 tracking-tight mt-0.5">
            {(kpis.harmonizedMatches ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-700 font-mono mt-0.5 font-medium">
            dual-sensor matches
          </div>
        </div>
      </div>

      {/* 5. Radiative Accounting Notice Card */}
      <div className="sci-card p-3.5 flex items-start gap-2.5 bg-slate-50/70 border-slate-200">
        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-slate-800 block">
            Radiative Accounting
          </span>
          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
            MODIS and VIIRS FRP are independent physical quantities and must not be added together.
          </p>
        </div>
      </div>
    </div>
  );
};
