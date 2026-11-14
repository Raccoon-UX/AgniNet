"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FireMap } from "@/components/map/FireMap";
import { ObservationInspector } from "@/components/dashboard/ObservationInspector";
import { DEMO_HOTSPOTS } from "@/data/fixtures";
import { HotspotObservation } from "@/types/fire";
import { fetchObservations } from "@/lib/api";
import {
  Layers,
  RefreshCw,
  Calendar,
  Info,
} from "lucide-react";

export default function MapPage() {
  const [observations, setObservations] = useState<HotspotObservation[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotObservation | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedDayRange, setSelectedDayRange] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

  const loadMapData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchObservations({
        source: selectedSource,
        day_range: selectedDayRange,
        demo: isDemo,
      });
      setObservations(res.observations);
      setIsLive(res.isLive);
      if (res.observations.length > 0) {
        setSelectedHotspot(res.observations[0]);
      } else {
        setSelectedHotspot(null);
      }
      if (res.error && !res.isLive) {
        setError(res.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (isDemo) {
        setObservations(DEMO_HOTSPOTS);
        setSelectedHotspot(DEMO_HOTSPOTS[0]);
      } else {
        setObservations([]);
        setSelectedHotspot(null);
      }
      setIsLive(false);
    } finally {
      if (isRefresh) setRefreshing(false);
      setLoading(false);
    }
  }, [selectedSource, selectedDayRange, isDemo]);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchObservations({
          source: selectedSource,
          day_range: selectedDayRange,
          demo: isDemo,
        });
        if (!ignore) {
          setObservations(res.observations);
          setIsLive(res.isLive);
          if (res.observations.length > 0) {
            setSelectedHotspot(res.observations[0]);
          } else {
            setSelectedHotspot(null);
          }
          if (res.error && !res.isLive) {
            setError(res.error);
          }
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          if (isDemo) {
            setObservations(DEMO_HOTSPOTS);
            setSelectedHotspot(DEMO_HOTSPOTS[0]);
          } else {
            setObservations([]);
            setSelectedHotspot(null);
          }
          setIsLive(false);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    execute();
    return () => {
      ignore = true;
    };
  }, [selectedSource, selectedDayRange, isDemo]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        badge="Geospatial Explorer / Multi-Sensor Canvas"
        title="Global Satellite Fire Explorer"
        description="High-resolution interactive visualization of active thermal infrared anomalies captured across NASA EOS (Terra/Aqua MODIS) and JPSS (Suomi-NPP/NOAA-20/21 VIIRS) polar orbits."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Feed vs Explicit Demo Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-300 text-xs shadow-xs">
              <button
                onClick={() => setIsDemo(false)}
                title="Query live NASA satellite telemetry"
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  !isDemo
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Live Feeds
              </button>
              <button
                onClick={() => setIsDemo(true)}
                title="Force synthetic demonstration benchmark"
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  isDemo
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Demo Mode
              </button>
            </div>

            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                NASA FIRMS LIVE
              </span>
            ) : isDemo ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                DEMO TELEMETRY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                {error ? "FEED OFFLINE" : "READY"}
              </span>
            )}

            <button
              onClick={() => loadMapData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Filter and Telemetry Strip */}
      <div className="sci-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">Sensor Stream:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-slate-500"
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
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">Time Window:</span>
            <select
              value={selectedDayRange}
              onChange={(e) => setSelectedDayRange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-slate-500"
            >
              <option value={1}>Past 24 Hours</option>
              <option value={2}>Past 48 Hours</option>
              <option value={7}>Past 7 Days</option>
            </select>
          </div>
        </div>

        <span className="text-slate-600 font-mono text-[11px]">
          Rendering <strong className="text-slate-900">{observations.length}</strong> active thermal nodes
        </span>
      </div>

      {/* Main Geospatial Explorer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Map Canvas (3 columns on large screens) */}
        <div className="lg:col-span-3 space-y-3">
          <FireMap
            heightClass="h-[640px]"
            selectedHotspot={selectedHotspot}
            onHotspotSelect={(h) => setSelectedHotspot(h)}
            observations={observations}
            isLive={isLive}
            isDemo={isDemo}
            loading={loading || refreshing}
            error={error}
          />

          <div className="p-3 sci-card text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Click any thermal anomaly pixel on the canvas to inspect full radiometric telemetry.
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              PROJECTION: EPSG:3857 (Web Mercator) &bull; WGS84 DATUM
            </div>
          </div>
        </div>

        {/* Observation Inspector Drawer (1 column) */}
        <div className="lg:col-span-1">
          <ObservationInspector
            observation={selectedHotspot}
            className="h-[640px] overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
}
