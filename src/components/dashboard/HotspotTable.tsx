"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HotspotObservation,
  SensorType,
} from "@/types/fire";
import {
  formatFRP,
  formatCoordinates,
  getFRPColor,
  getSensorBadgeClass,
} from "@/lib/utils";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Flame,
  ArrowUpDown,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface HotspotTableProps {
  hotspots: HotspotObservation[];
  onSelectHotspot?: (hotspot: HotspotObservation) => void;
  isLive?: boolean;
}

export const HotspotTable: React.FC<HotspotTableProps> = ({
  hotspots,
  onSelectHotspot,
  isLive = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sensorFilter, setSensorFilter] = useState<SensorType>("ALL");
  const [sortField, setSortField] = useState<"frpMw" | "confidence" | "acquisitionTimeUtc">("frpMw");
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCoords = (hotspot: HotspotObservation, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `${hotspot.latitude.toFixed(4)}, ${hotspot.longitude.toFixed(4)}`
    );
    setCopiedId(hotspot.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHotspots = useMemo(() => {
    return hotspots
      .filter((h) => {
        // Sensor filter
        if (sensorFilter !== "ALL") {
          if (sensorFilter === "HARMONIZED" && !h.isHarmonizedMatch) {
            return false;
          }
          if (sensorFilter !== "HARMONIZED" && h.sensor !== sensorFilter) {
            return false;
          }
        }
        // Search term
        if (searchTerm.trim() !== "") {
          const term = searchTerm.toLowerCase();
          const matchLoc =
            h.region.toLowerCase().includes(term) ||
            h.country.toLowerCase().includes(term) ||
            h.landCover.toLowerCase().includes(term) ||
            h.id.toLowerCase().includes(term) ||
            h.satellite.toLowerCase().includes(term);
          if (!matchLoc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "string" || typeof valB === "string") {
          return sortAsc
            ? String(valA ?? "").localeCompare(String(valB ?? ""))
            : String(valB ?? "").localeCompare(String(valA ?? ""));
        }
        const numA = typeof valA === "number" ? valA : -1;
        const numB = typeof valB === "number" ? valB : -1;
        return sortAsc ? numA - numB : numB - numA;
      });
  }, [hotspots, sensorFilter, searchTerm, sortField, sortAsc]);

  const toggleSort = (field: "frpMw" | "confidence" | "acquisitionTimeUtc") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="rounded-xl glass-panel p-5 flex flex-col space-y-4">
      {/* Table Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-semibold text-white">
              Recent Hotspot Detections Log
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {filteredHotspots.length} Records
            </span>
            {isLive ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                NASA FIRMS LIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                DEMO FIXTURES
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLive
              ? "Live NASA FIRMS satellite observations streamed via backend"
              : "Synchronized synthetic satellite telemetry buffer (MODIS 1km & VIIRS 375m)"}
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by country, region, biome..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-900/80 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Sensor Dropdown/Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/8 text-xs">
            <button
              onClick={() => setSensorFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                sensorFilter === "ALL"
                  ? "bg-slate-700/80 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSensorFilter("VIIRS")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                sensorFilter === "VIIRS"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              VIIRS 375m
            </button>
            <button
              onClick={() => setSensorFilter("MODIS")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                sensorFilter === "MODIS"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              MODIS 1km
            </button>
            <button
              onClick={() => setSensorFilter("HARMONIZED")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                sensorFilter === "HARMONIZED"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Harmonized
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {filteredHotspots.length === 0 ? (
        <EmptyState
          title="No Hotspot Detections Match"
          description={`No observations found matching "${searchTerm}". Try resetting your filter.`}
          onReset={() => {
            setSearchTerm("");
            setSensorFilter("ALL");
          }}
          resetLabel="Clear Search & Filters"
        />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/8 text-slate-400 font-medium tracking-wide uppercase text-[10px]">
                <th className="py-2.5 pr-4 pl-2">ID & Time</th>
                <th className="py-2.5 px-4">Location / Biome</th>
                <th className="py-2.5 px-4">Sensor & Platform</th>
                <th
                  className="py-2.5 px-4 cursor-pointer hover:text-orange-400 select-none"
                  onClick={() => toggleSort("frpMw")}
                >
                  <div className="flex items-center gap-1">
                    <span>Fire Radiative Power (MW)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-4 cursor-pointer hover:text-orange-400 select-none"
                  onClick={() => toggleSort("confidence")}
                >
                  <div className="flex items-center gap-1">
                    <span>Confidence</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-4">Coordinates</th>
                <th className="py-2.5 pl-4 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredHotspots.map((hotspot) => {
                const frpInfo = getFRPColor(hotspot.frpMw);
                const sensorBadge = getSensorBadgeClass(
                  hotspot.isHarmonizedMatch ? "HARMONIZED" : hotspot.sensor
                );

                return (
                  <tr
                    key={hotspot.id}
                    onClick={() => onSelectHotspot && onSelectHotspot(hotspot)}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    {/* ID & Time */}
                    <td className="py-3 pr-4 pl-2">
                      <div className="font-mono text-xs font-semibold text-slate-200">
                        {hotspot.id}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {hotspot.acquisitionDate} &bull; {hotspot.acquisitionTimeUtc ? `${hotspot.acquisitionTimeUtc} UTC` : "Time Unspecified"}
                      </div>
                    </td>

                    {/* Location / Biome */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">
                        {hotspot.region}, {hotspot.country}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {hotspot.landCover}
                      </div>
                    </td>

                    {/* Sensor & Satellite */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${sensorBadge}`}
                        >
                          {hotspot.sensor}
                        </span>
                        {hotspot.isHarmonizedMatch && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                            FUSED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {hotspot.satellite} &bull; Scan {hotspot.scanAngle != null ? `${hotspot.scanAngle}°` : "N/A"}
                      </div>
                    </td>

                    {/* FRP */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${frpInfo.badge}`}
                        >
                          <Flame className="w-3 h-3" />
                          {formatFRP(hotspot.frpMw)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        Brightness {hotspot.brightnessKelvin != null ? `${hotspot.brightnessKelvin} K` : "N/A"}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4">
                      {hotspot.confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                hotspot.confidence >= 80
                                  ? "bg-emerald-400"
                                  : hotspot.confidence >= 50
                                  ? "bg-amber-400"
                                  : "bg-yellow-400"
                              }`}
                              style={{ width: `${hotspot.confidence}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-200">
                            {hotspot.confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-slate-500 italic">
                          Unrated
                        </span>
                      )}
                    </td>

                    {/* Coordinates */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                        <span>{formatCoordinates(hotspot.latitude, hotspot.longitude)}</span>
                        <button
                          onClick={(e) => handleCopyCoords(hotspot, e)}
                          className="p-1 text-slate-500 hover:text-orange-400 rounded transition-colors"
                          title="Copy Latitude, Longitude"
                        >
                          {copiedId === hotspot.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 pl-4 pr-2 text-right">
                      <Link
                        href={`/map?lat=${hotspot.latitude}&lon=${hotspot.longitude}&zoom=9`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-md border border-orange-500/20 transition-all"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
