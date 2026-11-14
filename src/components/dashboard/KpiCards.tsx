"use client";

import React from "react";
import {
  Flame,
  Radio,
  Satellite,
  ArrowUpRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { HotspotKpis } from "@/types/fire";

interface KpiCardsProps {
  kpis: HotspotKpis;
  isLive?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, isLive = false }) => {
  const liveActive = isLive || kpis.isLive || kpis.dataSource === "NASA_FIRMS_LIVE";

  return (
    <div className="space-y-2">
      {/* Feed Freshness Indicator */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {liveActive ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY BUFFER &bull; NASA FIRMS NRT
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              SYNTHETIC DEMO TELEMETRY BUFFER
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          {liveActive ? "Source: NASA EOSDIS LANCE" : "Source: Synthetic Concept Fixtures"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Hotspots */}
        <div className="relative overflow-hidden rounded-xl glass-panel p-5 group hover:border-orange-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Active Hotspots
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm shadow-orange-500/20">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {kpis.totalHotspots.toLocaleString()}
            </span>
            {kpis.totalHotspotsDelta != null && (
              <span className="inline-flex items-center text-xs font-semibold text-orange-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{kpis.totalHotspotsDelta}%
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
            <span className="text-[11px]">Cumulative Radiative Energy</span>
            <span className="font-mono text-orange-300 text-[11px] font-medium">
              {kpis.totalFrpGigawatts} GW FRP
            </span>
          </div>
        </div>

        {/* 2. MODIS Detections */}
        <div className="relative overflow-hidden rounded-xl glass-panel p-5 group hover:border-purple-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                MODIS Detections
              </span>
              <span className="block text-[10px] text-purple-400/80 font-mono">
                Terra &bull; Aqua &bull; 1000m
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Satellite className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {kpis.modisCount.toLocaleString()}
            </span>
            {kpis.modisDelta != null && (
              <span className="inline-flex items-center text-xs font-semibold text-purple-400">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{kpis.modisDelta}%
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
            <span className="text-[11px]">Coarse 1km Resolution</span>
            <span className="font-mono text-purple-300 text-[11px]">
              MOD14 / MYD14
            </span>
          </div>
        </div>

        {/* 3. VIIRS Detections */}
        <div className="relative overflow-hidden rounded-xl glass-panel p-5 group hover:border-cyan-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                VIIRS Detections
              </span>
              <span className="block text-[10px] text-cyan-400/80 font-mono">
                S-NPP &bull; NOAA-20/21 &bull; 375m
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {kpis.viirsCount.toLocaleString()}
            </span>
            {kpis.viirsDelta != null && (
              <span className="inline-flex items-center text-xs font-semibold text-cyan-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{kpis.viirsDelta}%
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
            <span className="text-[11px]">High-Res I-Band (I4/I5)</span>
            <span className="font-mono text-cyan-300 text-[11px]">
              VNP14 / VJ114
            </span>
          </div>
        </div>

        {/* 4. Cross-Sensor Match / Confidence Index */}
        <div className="relative overflow-hidden rounded-xl glass-panel p-5 group hover:border-amber-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Detection Reliability
              </span>
              <span className="block text-[10px] text-amber-400/80 font-mono">
                Observation Confidence
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {kpis.avgConfidence != null ? `${kpis.avgConfidence}%` : "N/A"}
            </span>
            <span
              className={`inline-flex items-center text-xs font-semibold ${
                kpis.avgConfidence != null && kpis.avgConfidence >= 80
                  ? "text-emerald-400"
                  : kpis.avgConfidence != null && kpis.avgConfidence >= 50
                  ? "text-amber-400"
                  : "text-slate-400"
              }`}
            >
              {kpis.avgConfidence != null
                ? kpis.avgConfidence >= 80
                  ? "High Conf"
                  : "Nominal"
                : "Unrated"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
            <span className="text-[11px]">Harmonized Dual-Pass</span>
            <span className="font-mono text-amber-300 text-[11px] font-semibold">
              {kpis.harmonizedMatches != null
                ? `${kpis.harmonizedMatches.toLocaleString()} Dual-Matches`
                : "0 Dual-Matches"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
