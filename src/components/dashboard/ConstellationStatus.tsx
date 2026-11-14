"use client";

import React from "react";
import { Satellite, CheckCircle, Clock } from "lucide-react";

interface SatelliteInfo {
  name: string;
  sensor: "MODIS" | "VIIRS";
  resolution: string;
  altitude: string;
  orbitType: string;
  status: "Nominal" | "Active";
  nextPassUtc: string;
}

const SATELLITE_CONSTELLATION: SatelliteInfo[] = [
  {
    name: "Terra (EOS AM-1)",
    sensor: "MODIS",
    resolution: "1000m",
    altitude: "705 km",
    orbitType: "Sun-synchronous (10:30 descend)",
    status: "Nominal",
    nextPassUtc: "In 48m",
  },
  {
    name: "Aqua (EOS PM-1)",
    sensor: "MODIS",
    resolution: "1000m",
    altitude: "705 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    status: "Nominal",
    nextPassUtc: "In 1h 12m",
  },
  {
    name: "Suomi-NPP",
    sensor: "VIIRS",
    resolution: "375m",
    altitude: "824 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    status: "Active",
    nextPassUtc: "In 22m",
  },
  {
    name: "NOAA-20 (JPSS-1)",
    sensor: "VIIRS",
    resolution: "375m",
    altitude: "824 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    status: "Active",
    nextPassUtc: "In 35m",
  },
  {
    name: "NOAA-21 (JPSS-2)",
    sensor: "VIIRS",
    resolution: "375m",
    altitude: "824 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    status: "Active",
    nextPassUtc: "In 1h 05m",
  },
];

export const ConstellationStatus: React.FC = () => {
  return (
    <div className="rounded-xl glass-panel p-5 flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Spacecraft & Sensor Constellation Health
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronous Low Earth Orbit (LEO) orbital tracks & upcoming swaths
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ALL SENSORS NOMINAL</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SATELLITE_CONSTELLATION.map((sat) => (
          <div
            key={sat.name}
            className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-2 relative overflow-hidden group hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  sat.sensor === "VIIRS"
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                }`}
              >
                {sat.sensor} &bull; {sat.resolution}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                {sat.status}
              </span>
            </div>

            <div>
              <h5 className="font-semibold text-xs text-slate-200 truncate">
                {sat.name}
              </h5>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Alt: {sat.altitude}
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Next Swath:
              </span>
              <span className="font-mono text-slate-300 font-medium">
                {sat.nextPassUtc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
