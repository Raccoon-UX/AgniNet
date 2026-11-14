"use client";

import React from "react";
import Link from "next/link";
import { DEMO_REGIONS } from "@/data/fixtures";
import { formatFRP } from "@/lib/utils";
import { Globe, ArrowUpRight, TrendingDown, Minus, ExternalLink } from "lucide-react";

export const RegionalBreakdown: React.FC = () => {
  return (
    <div className="rounded-xl glass-panel p-5 flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-semibold text-white">
              Global Fire Regimes & Biome Hotspots
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time regional active fire density and peak radiative intensity
          </p>
        </div>
        <Link
          href="/map"
          className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
        >
          <span>Full Map</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEMO_REGIONS.map((region) => {
          return (
            <div
              key={region.regionId}
              className="p-3.5 rounded-lg bg-slate-900/60 border border-white/5 hover:border-orange-500/30 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-orange-400 transition-colors">
                    {region.regionName}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                      region.trend === "rising"
                        ? "bg-red-500/15 text-red-400 border border-red-500/20"
                        : region.trend === "declining"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-700/40 text-slate-400 border border-slate-600/30"
                    }`}
                  >
                    {region.trend === "rising" && <ArrowUpRight className="w-3 h-3" />}
                    {region.trend === "declining" && <TrendingDown className="w-3 h-3" />}
                    {region.trend === "stable" && <Minus className="w-3 h-3" />}
                    {region.trend.toUpperCase()}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                  {region.dominantLandCover}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Active Hotspots</span>
                  <span className="font-mono font-semibold text-slate-100">
                    {region.activeHotspots.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Peak FRP</span>
                  <span className="font-mono font-semibold text-orange-400">
                    {formatFRP(region.highestFrpMw)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
