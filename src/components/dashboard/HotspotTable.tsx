"use client";

import React, { useState, useMemo } from "react";
import { HotspotObservation, SensorType } from "@/types/fire";
import { formatCoordinates } from "@/lib/utils";
import {
  Search,
  Copy,
  Check,
  ArrowUpDown,
  Eye,
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
  const [page, setPage] = useState(1);
  const pageSize = 15;

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
        if (sensorFilter !== "ALL") {
          if (sensorFilter === "HARMONIZED" && !h.isHarmonizedMatch) return false;
          if (sensorFilter !== "HARMONIZED" && h.sensor !== sensorFilter) return false;
        }

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchId = h.id.toLowerCase().includes(term);
          const matchSat = h.satellite.toLowerCase().includes(term);
          const matchRegion = h.region.toLowerCase().includes(term);
          const matchCountry = h.country.toLowerCase().includes(term);
          if (!matchId && !matchSat && !matchRegion && !matchCountry) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA: string | number = a[sortField] ?? 0;
        const valB: string | number = b[sortField] ?? 0;

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [hotspots, sensorFilter, searchTerm, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredHotspots.length / pageSize) || 1;
  const paginatedHotspots = filteredHotspots.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: "frpMw" | "confidence" | "acquisitionTimeUtc") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm space-y-3">
      {/* Table Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Satellite Hotspot Observation Registry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual active fire pixels indexed from MODIS and VIIRS telemetry streams {isLive ? "(NASA FIRMS NRT)" : "(Synthetic Buffer)"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, Sector, Sat..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-slate-500 w-44 sm:w-56"
            />
          </div>

          {/* Sensor Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
            {(["ALL", "VIIRS", "MODIS", "HARMONIZED"] as SensorType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSensorFilter(type);
                  setPage(1);
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  sensorFilter === type
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {type === "ALL" ? "All" : type === "HARMONIZED" ? "Harmonized" : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Canvas */}
      {paginatedHotspots.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No Observation Pixels Found"
            description="No active fire records match the search or filter criteria in the current telemetry buffer."
            onReset={() => {
              setSearchTerm("");
              setSensorFilter("ALL");
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Observation ID</th>
                <th className="py-2.5 px-3">Sensor / Satellite</th>
                <th className="py-2.5 px-3">Sector Coordinates</th>
                <th className="py-2.5 px-3">
                  <button
                    onClick={() => toggleSort("frpMw")}
                    className="flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                  >
                    <span>FRP (MW)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Brightness (K)</th>
                <th className="py-2.5 px-3">
                  <button
                    onClick={() => toggleSort("confidence")}
                    className="flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                  >
                    <span>Confidence</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">
                  <button
                    onClick={() => toggleSort("acquisitionTimeUtc")}
                    className="flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                  >
                    <span>Acquisition (UTC)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {paginatedHotspots.map((hotspot) => {
                const isVIIRS = hotspot.sensor === "VIIRS";
                const frpVal = hotspot.frpMw ?? 0;

                return (
                  <tr
                    key={hotspot.id}
                    onClick={() => onSelectHotspot && onSelectHotspot(hotspot)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{hotspot.id}</span>
                        {hotspot.isHarmonizedMatch && (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                            MATCH
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isVIIRS
                            ? "bg-sky-50 text-sky-800 border border-sky-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {hotspot.sensor} &bull; {hotspot.satellite}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span>{formatCoordinates(hotspot.latitude, hotspot.longitude)}</span>
                        <button
                          onClick={(e) => handleCopyCoords(hotspot, e)}
                          title="Copy Lat/Lon"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                        >
                          {copiedId === hotspot.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-bold">
                      <span
                        className={
                          frpVal > 300
                            ? "text-red-700"
                            : frpVal > 100
                            ? "text-orange-700"
                            : "text-slate-800"
                        }
                      >
                        {hotspot.frpMw != null ? `${hotspot.frpMw.toFixed(1)} MW` : "N/A"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-800">
                      {hotspot.brightnessKelvin != null ? `${hotspot.brightnessKelvin.toFixed(1)} K` : "N/A"}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-emerald-700 font-semibold">
                        {hotspot.confidence != null ? `${hotspot.confidence}%` : "Not reported"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {hotspot.acquisitionDate ? `${hotspot.acquisitionDate} ` : ""}
                      {hotspot.acquisitionTimeUtc || "Not reported"}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectHotspot) onSelectHotspot(hotspot);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-200 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Pagination Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-mono">
        <div>
          Showing {paginatedHotspots.length} of {filteredHotspots.length} matching observations
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Previous
          </button>
          <span className="px-2 py-1 text-slate-800 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
