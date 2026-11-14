"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FireMap } from "@/components/map/FireMap";
import { DEMO_HOTSPOTS } from "@/data/fixtures";
import { HotspotObservation } from "@/types/fire";
import { fetchObservations } from "@/lib/api";
import { formatFRP, formatCoordinates, getFRPColor, getSensorBadgeClass } from "@/lib/utils";
import {
  Layers,
  Copy,
  Check,
  Eye,
  Info,
  RefreshCw,
  Radio,
  AlertCircle,
  Calendar,
} from "lucide-react";

export default function MapPage() {
  const [observations, setObservations] = useState<HotspotObservation[]>(DEMO_HOTSPOTS);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotObservation | null>(DEMO_HOTSPOTS[0]);
  const [copied, setCopied] = useState(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedDayRange, setSelectedDayRange] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

  const loadMapData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetchObservations({
        source: selectedSource,
        day_range: selectedDayRange,
      });
      setObservations(res.observations);
      setIsLive(res.isLive);
      if (res.observations.length > 0) {
        setSelectedHotspot(res.observations[0]);
      }
    } catch {
      setObservations(DEMO_HOTSPOTS);
      setIsLive(false);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [selectedSource, selectedDayRange]);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      try {
        const res = await fetchObservations({
          source: selectedSource,
          day_range: selectedDayRange,
        });
        if (!ignore) {
          setObservations(res.observations);
          setIsLive(res.isLive);
          if (res.observations.length > 0) {
            setSelectedHotspot(res.observations[0]);
          }
        }
      } catch {
        if (!ignore) {
          setObservations(DEMO_HOTSPOTS);
          setIsLive(false);
        }
      }
    }

    execute();
    return () => {
      ignore = true;
    };
  }, [selectedSource, selectedDayRange]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Geospatial Fire Canvas &bull; Phase 2"
        title="Global Satellite Fire Explorer"
        description="High-resolution interactive visualization of active thermal anomalies captured across NASA EOS (MODIS) and JPSS (VIIRS) polar orbits."
        action={
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                NASA FIRMS LIVE STREAM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                DEMO MODE
              </span>
            )}

            <button
              onClick={() => loadMapData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Map Filter Controls Bar */}
      <div className="rounded-xl glass-panel p-3.5 flex flex-wrap items-center justify-between gap-3 border border-white/10 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-400 font-semibold">Sensor Stream:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-900 border border-white/10 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500/50"
            >
              <option value="ALL">All Satellite Feeds</option>
              <option value="VIIRS">VIIRS Constellation (375m)</option>
              <option value="MODIS">MODIS Terra & Aqua (1000m)</option>
              <option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20</option>
              <option value="VIIRS_NOAA21_NRT">VIIRS NOAA-21</option>
              <option value="VIIRS_SNPP_NRT">VIIRS Suomi-NPP</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-semibold">Time Window:</span>
            <select
              value={selectedDayRange}
              onChange={(e) => setSelectedDayRange(Number(e.target.value))}
              className="bg-slate-900 border border-white/10 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value={1}>Past 24 Hours</option>
              <option value={2}>Past 48 Hours</option>
              <option value={7}>Past 7 Days</option>
            </select>
          </div>
        </div>

        <span className="text-slate-500 font-mono text-[11px]">
          {observations.length} active thermal nodes rendered
        </span>
      </div>

      {/* Main Map + Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Map Canvas (3 columns on large screens) */}
        <div className="lg:col-span-3 space-y-4">
          <FireMap
            heightClass="h-[640px]"
            selectedHotspot={selectedHotspot}
            onHotspotSelect={(h) => setSelectedHotspot(h)}
            observations={observations}
            isLive={isLive}
          />

          <div className="p-4 rounded-xl glass-panel text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Tip: Click any marker to center and load full radiometer telemetry in the inspector panel.
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              PROJECTION: EPSG:3857 (Web Mercator) &bull; WGS84 DATUM
            </div>
          </div>
        </div>

        {/* Hotspot Telemetry Inspector Drawer (1 column) */}
        <div className="lg:col-span-1 space-y-4">
          {selectedHotspot ? (
            <div className="rounded-xl glass-panel-elevated p-5 space-y-4 border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getSensorBadgeClass(
                        selectedHotspot.isHarmonizedMatch ? "HARMONIZED" : selectedHotspot.sensor
                      )}`}
                    >
                      {selectedHotspot.sensor}
                    </span>
                    {selectedHotspot.isLive && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        LIVE
                      </span>
                    )}
                  </div>
                  <h3 className="font-mono text-base font-bold text-white mt-1">
                    {selectedHotspot.id}
                  </h3>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                      getFRPColor(selectedHotspot.frpMw).badge
                    }`}
                  >
                    {formatFRP(selectedHotspot.frpMw)}
                  </span>
                </div>
              </div>

              {/* Geographic Coordinates & Copy */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  Target Centroid (WGS84)
                </span>
                <div className="flex items-center justify-between font-mono text-xs text-slate-200">
                  <span>
                    {formatCoordinates(selectedHotspot.latitude, selectedHotspot.longitude)}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `${selectedHotspot.latitude.toFixed(4)}, ${selectedHotspot.longitude.toFixed(4)}`
                      )
                    }
                    className="p-1 text-slate-400 hover:text-orange-400 transition-colors cursor-pointer"
                    title="Copy coordinates"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedHotspot.region}, {selectedHotspot.country}
                </div>
              </div>

              {/* Sensor Radiative Telemetry */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
                  Sensor Telemetry
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Spacecraft</span>
                    <span className="font-medium text-slate-200">{selectedHotspot.satellite}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Day / Night</span>
                    <span className="font-mono text-slate-200">
                      {selectedHotspot.dayNight === "D" ? "Daytime Pass" : "Nighttime Pass"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Brightness (T21/I4)</span>
                    <span className="font-mono text-orange-400 font-semibold">
                      {selectedHotspot.brightnessKelvin ? `${selectedHotspot.brightnessKelvin} K` : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Background (T31/I5)</span>
                    <span className="font-mono text-slate-300">
                      {selectedHotspot.brightT31Kelvin ? `${selectedHotspot.brightT31Kelvin} K` : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Scan Angle</span>
                    <span className="font-mono text-slate-300">
                      {selectedHotspot.scanAngle ? `${selectedHotspot.scanAngle}°` : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Pixel Footprint</span>
                    <span className="font-mono text-slate-300">
                      {selectedHotspot.trackKm ? `${selectedHotspot.trackKm} km` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence & Land Cover */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Detection Confidence</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedHotspot.confidence}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: `${selectedHotspot.confidence}%` }}
                  />
                </div>
                <div className="pt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500 block text-[10px]">Source Identifier</span>
                  <span className="text-slate-200 font-mono text-[10px]">
                    {selectedHotspot.sensorSource || selectedHotspot.sensor} &bull; v{selectedHotspot.version}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl glass-panel p-8 text-center text-slate-400 space-y-3">
              <Eye className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Hotspot Selected</p>
              <p className="text-xs text-slate-500">
                Click any hotspot point on the map to inspect radiant temperature, platform details, and land cover.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
