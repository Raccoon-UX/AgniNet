"use client";

import React from "react";
import { Satellite, CheckCircle } from "lucide-react";

interface SatelliteInfo {
  name: string;
  shortCode: "Terra" | "Aqua" | "Suomi-NPP" | "NOAA-20" | "NOAA-21";
  sensor: "MODIS" | "VIIRS";
  feedSource: string;
  resolution: string;
  altitude: string;
  orbitType: string;
  crossingTime: string;
}

const SATELLITE_CONSTELLATION: SatelliteInfo[] = [
  {
    name: "Terra (EOS AM-1)",
    shortCode: "Terra",
    sensor: "MODIS",
    feedSource: "MODIS_NRT",
    resolution: "1000m nadir",
    altitude: "705 km",
    orbitType: "Sun-synchronous polar",
    crossingTime: "10:30 AM (Descending)",
  },
  {
    name: "Aqua (EOS PM-1)",
    shortCode: "Aqua",
    sensor: "MODIS",
    feedSource: "MODIS_NRT",
    resolution: "1000m nadir",
    altitude: "705 km",
    orbitType: "Sun-synchronous polar",
    crossingTime: "01:30 PM (Ascending)",
  },
  {
    name: "Suomi-NPP",
    shortCode: "Suomi-NPP",
    sensor: "VIIRS",
    feedSource: "VIIRS_SNPP_NRT",
    resolution: "375m nadir",
    altitude: "824 km",
    orbitType: "Sun-synchronous polar",
    crossingTime: "01:30 PM (Ascending)",
  },
  {
    name: "NOAA-20 (JPSS-1)",
    shortCode: "NOAA-20",
    sensor: "VIIRS",
    feedSource: "VIIRS_NOAA20_NRT",
    resolution: "375m nadir",
    altitude: "824 km",
    orbitType: "Sun-synchronous polar",
    crossingTime: "01:30 PM (Ascending)",
  },
  {
    name: "NOAA-21 (JPSS-2)",
    shortCode: "NOAA-21",
    sensor: "VIIRS",
    feedSource: "VIIRS_NOAA21_NRT",
    resolution: "375m nadir",
    altitude: "824 km",
    orbitType: "Sun-synchronous polar",
    crossingTime: "01:30 PM (Ascending)",
  },
];

interface ConstellationStatusProps {
  detectedSatellites?: string[];
  activeFeedCount?: number;
  totalFeedCount?: number;
  isLive?: boolean;
}

export const ConstellationStatus: React.FC<ConstellationStatusProps> = ({
  detectedSatellites = [],
  activeFeedCount = 4,
  totalFeedCount = 4,
  isLive = false,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Spacecraft Constellation & Orbit Parameters
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational status and telemetry feeds across NASA EOS and JPSS polar orbiting assets
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
            {activeFeedCount} / {totalFeedCount} {isLive ? "NASA FIRMS Feeds" : "Telemetry Feeds"} Active
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider bg-slate-50">
              <th className="py-2 px-3">Spacecraft</th>
              <th className="py-2 px-3">Sensor</th>
              <th className="py-2 px-3">Resolution</th>
              <th className="py-2 px-3">Equator Crossing</th>
              <th className="py-2 px-3">Altitude</th>
              <th className="py-2 px-3 text-right">Telemetry Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {SATELLITE_CONSTELLATION.map((sat) => {
              const isDetected =
                detectedSatellites.length === 0 ||
                detectedSatellites.includes(sat.shortCode);

              const isVIIRS = sat.sensor === "VIIRS";

              return (
                <tr key={sat.shortCode} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {sat.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isVIIRS
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-purple-50 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {sat.sensor}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {sat.resolution}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {sat.crossingTime}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {sat.altitude}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isDetected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Nominal Stream
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        Standby
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
