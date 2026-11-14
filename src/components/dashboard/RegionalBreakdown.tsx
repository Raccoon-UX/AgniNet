"use client";

import React from "react";
import Link from "next/link";
import { DEMO_REGIONS } from "@/data/fixtures";
import { Globe, ArrowUpRight, TrendingDown, Minus, ExternalLink } from "lucide-react";

export const RegionalBreakdown: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Regional Fire Regimes & Biomes
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic hotspot distribution across continental monitoring sectors
          </p>
        </div>
        <Link
          href="/map"
          className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1"
        >
          <span>Map View</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEMO_REGIONS.map((region) => {
          return (
            <div
              key={region.regionId}
              className="p-3 rounded-md border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-slate-900">
                    {region.regionName}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded ${
                      region.trend === "rising"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : region.trend === "declining"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {region.trend === "rising" && <ArrowUpRight className="w-3 h-3" />}
                    {region.trend === "declining" && <TrendingDown className="w-3 h-3" />}
                    {region.trend === "stable" && <Minus className="w-3 h-3" />}
                    {region.trend.toUpperCase()}
                  </span>
                </div>

                <div className="mt-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Hotspot Pixels:</span>
                    <span className="font-semibold text-slate-900">
                      {region.activeHotspots.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mt-0.5">
                    <span>Peak Single-Fire:</span>
                    <span className="text-orange-700 font-medium">
                      {region.highestFrpMw.toFixed(1)} MW FRP
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate max-w-[120px]">{region.dominantLandCover}</span>
                <span className="font-mono text-slate-400">
                  {region.centerLat > 0 ? `${region.centerLat}°N` : `${Math.abs(region.centerLat)}°S`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
