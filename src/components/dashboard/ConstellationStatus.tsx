"use client";

import React from "react";
import { Satellite, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface SatelliteInfo {
  name: string;
  shortCode: "Terra" | "Aqua" | "Suomi-NPP" | "NOAA-20" | "NOAA-21";
  sensor: "MODIS" | "VIIRS";
  feedSource: string;
  resolution: string;
  altitude: string;
  orbitType: string;
  nextPassUtc: string;
}

const SATELLITE_CONSTELLATION: SatelliteInfo[] = [
  {
    name: "Terra (EOS AM-1)",
    shortCode: "Terra",
    sensor: "MODIS",
    feedSource: "MODIS_NRT",
    resolution: "1000m",
    altitude: "705 km",
    orbitType: "Sun-synchronous (10:30 descend)",
    nextPassUtc: "In 48m",
  },
  {
    name: "Aqua (EOS PM-1)",
    shortCode: "Aqua",
    sensor: "MODIS",
    feedSource: "MODIS_NRT",
    resolution: "1000m",
    altitude: "705 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    nextPassUtc: "In 1h 12m",
  },
  {
    name: "Suomi-NPP",
    shortCode: "Suomi-NPP",
    sensor: "VIIRS",
    feedSource: "VIIRS_SNPP_NRT",
    resolution: "375m",
    altitude: "824 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    nextPassUtc: "In 22m",
  },
  {
    name: "NOAA-20 (JPSS-1)",
    shortCode: "NOAA-20",
    sensor: "VIIRS",
    feedSource: "VIIRS_NOAA20_NRT",
    resolution: "375m",
    altitude: "824 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    nextPassUtc: "In 35m",
  },
  {
    name: "NOAA-21 (JPSS-2)",
    shortCode: "NOAA-21",
    sensor: "VIIRS",
    feedSource: "VIIRS_NOAA21_NRT",
    resolution: "375m",
    altitude: "824 km",
    orbitType: "Sun-synchronous (13:30 ascend)",
    nextPassUtc: "In 1h 05m",
  },
];

interface ConstellationStatusProps {
  detectedSatellites?: string[];
  activeFeedCount?: number;
  totalFeedCount?: number;
  succeededSources?: string[];
  failedSources?: string[];
  isLive?: boolean;
}

export const ConstellationStatus: React.FC<ConstellationStatusProps> = ({
  detectedSatellites,
  activeFeedCount,
  totalFeedCount = 4,
  succeededSources,
  failedSources,
  isLive = false,
}) => {
  const feedCount = activeFeedCount ?? (succeededSources ? succeededSources.length : (isLive ? 4 : 4));
  const detectedPlatforms = detectedSatellites ?? (isLive ? [] : ["Terra", "Aqua", "Suomi-NPP", "NOAA-20", "NOAA-21"]);

  return (
    <div className="rounded-xl glass-panel p-5 flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Spacecraft Constellation & Feed Ingestion Health
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Independent tracking: 4 NASA FIRMS NRT data feeds &bull; 5 physical orbital platforms
          </p>
        </div>
        <div>
          {isLive ? (
            <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {feedCount}/{totalFeedCount} FEEDS ACTIVE &bull; {detectedPlatforms.length}/5 PLATFORMS OBSERVED
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-mono text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>SYNTHETIC TELEMETRY &bull; 5 PLATFORMS SIMULATED</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SATELLITE_CONSTELLATION.map((sat) => {
          const hasDetections = detectedPlatforms.some((dp) =>
            dp.toLowerCase().includes(sat.shortCode.toLowerCase())
          );
          const feedFailed = failedSources?.includes(sat.feedSource);
          const feedSucceeded = succeededSources
            ? succeededSources.includes(sat.feedSource)
            : isLive;

          return (
            <div
              key={sat.name}
              className={`p-3 rounded-lg bg-slate-900/60 border space-y-2 relative overflow-hidden group transition-all ${
                hasDetections
                  ? "border-emerald-500/30 hover:border-emerald-500/50"
                  : feedFailed
                  ? "border-red-500/30 hover:border-red-500/50"
                  : "border-white/5 hover:border-cyan-500/30"
              }`}
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

                {hasDetections ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 font-mono">
                    <CheckCircle className="w-3 h-3" />
                    Observed
                  </span>
                ) : feedFailed ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 font-mono">
                    <AlertCircle className="w-3 h-3" />
                    Feed Error
                  </span>
                ) : isLive && feedSucceeded ? (
                  <span className="text-[10px] font-medium text-slate-400 font-mono">
                    In Orbit / Quiet
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-300 font-mono">
                    Simulated
                  </span>
                )}
              </div>

              <div>
                <h5 className="font-semibold text-xs text-slate-200 truncate">
                  {sat.name}
                </h5>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Feed: {sat.feedSource}
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
          );
        })}
      </div>
    </div>
  );
};
