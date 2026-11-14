"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { ActivityTrendChart } from "@/components/dashboard/ActivityTrendChart";
import { HotspotTable } from "@/components/dashboard/HotspotTable";
import { RegionalBreakdown } from "@/components/dashboard/RegionalBreakdown";
import { ConstellationStatus } from "@/components/dashboard/ConstellationStatus";
import { FireMap } from "@/components/map/FireMap";
import { DEMO_KPIS, DEMO_HOTSPOTS } from "@/data/fixtures";
import { HotspotKpis, HotspotObservation } from "@/types/fire";
import { fetchObservations } from "@/lib/api";
import { RefreshCw, Radio, Flame, AlertCircle, Filter, Calendar, Layers } from "lucide-react";
import Link from "next/link";

export default function OverviewPage() {
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotObservation | null>(null);
  const [observations, setObservations] = useState<HotspotObservation[]>(DEMO_HOTSPOTS);
  const [kpis, setKpis] = useState<HotspotKpis>(DEMO_KPIS);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Filter state
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedDayRange, setSelectedDayRange] = useState<number>(1);
  const [selectedRegionPreset, setSelectedRegionPreset] = useState<string>("all");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    let bbox: { min_lon?: number; min_lat?: number; max_lon?: number; max_lat?: number } = {};
    if (selectedRegionPreset === "us") {
      bbox = { min_lon: -125.0, min_lat: 32.0, max_lon: -114.0, max_lat: 42.5 };
    } else if (selectedRegionPreset === "amazon") {
      bbox = { min_lon: -70.0, min_lat: -18.0, max_lon: -48.0, max_lat: 2.0 };
    } else if (selectedRegionPreset === "australia") {
      bbox = { min_lon: 120.0, min_lat: -25.0, max_lon: 145.0, max_lat: -12.0 };
    }

    try {
      const result = await fetchObservations({
        source: selectedSource,
        day_range: selectedDayRange,
        ...bbox,
      });

      setObservations(result.observations);
      setKpis(result.kpis);
      setIsLive(result.isLive);
      setLastFetchTime(result.fetchedAt);
      setNotice(result.notice ?? null);
      if (result.error && !result.isLive) {
        setError(result.error);
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setObservations(DEMO_HOTSPOTS);
      setKpis(DEMO_KPIS);
      setIsLive(false);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [selectedSource, selectedDayRange, selectedRegionPreset]);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      let bbox: { min_lon?: number; min_lat?: number; max_lon?: number; max_lat?: number } = {};
      if (selectedRegionPreset === "us") {
        bbox = { min_lon: -125.0, min_lat: 32.0, max_lon: -114.0, max_lat: 42.5 };
      } else if (selectedRegionPreset === "amazon") {
        bbox = { min_lon: -70.0, min_lat: -18.0, max_lon: -48.0, max_lat: 2.0 };
      } else if (selectedRegionPreset === "australia") {
        bbox = { min_lon: 120.0, min_lat: -25.0, max_lon: 145.0, max_lat: -12.0 };
      }

      try {
        const result = await fetchObservations({
          source: selectedSource,
          day_range: selectedDayRange,
          ...bbox,
        });

        if (!ignore) {
          setObservations(result.observations);
          setKpis(result.kpis);
          setIsLive(result.isLive);
          setLastFetchTime(result.fetchedAt);
          setNotice(result.notice ?? null);
          if (result.error && !result.isLive) {
            setError(result.error);
          } else {
            setError(null);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setObservations(DEMO_HOTSPOTS);
          setKpis(DEMO_KPIS);
          setIsLive(false);
        }
      }
    }

    execute();
    return () => {
      ignore = true;
    };
  }, [selectedSource, selectedDayRange, selectedRegionPreset]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        badge="Mission Control &bull; Phase 2 Live Stream"
        title="Active Satellite Fire Intelligence"
        description="Near real-time fusion of NASA MODIS (Terra/Aqua) and VIIRS (Suomi-NPP/NOAA-20/21) active fire observations with automated backend ingestion and radiative power quantification."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span>{refreshing ? "Syncing..." : "Sync Buffer"}</span>
            </button>

            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-600/25 transition-all rounded-lg"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Full Interactive Map</span>
            </Link>
          </div>
        }
      />

      {/* Filter and Telemetry Control Bar */}
      <div className="rounded-xl glass-panel p-4 flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sensor Feed Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-semibold text-slate-400">Sensor:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-900 border border-white/10 text-slate-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-orange-500/50"
            >
              <option value="ALL">All Sensors (Merged)</option>
              <option value="VIIRS">VIIRS (Suomi-NPP & NOAA-20/21)</option>
              <option value="MODIS">MODIS (Terra & Aqua)</option>
              <option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20 (375m)</option>
              <option value="VIIRS_NOAA21_NRT">VIIRS NOAA-21 (375m)</option>
              <option value="VIIRS_SNPP_NRT">VIIRS Suomi-NPP (375m)</option>
              <option value="MODIS_NRT">MODIS NRT (1000m)</option>
            </select>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-400">Window:</span>
            <select
              value={selectedDayRange}
              onChange={(e) => setSelectedDayRange(Number(e.target.value))}
              className="bg-slate-900 border border-white/10 text-slate-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value={1}>Last 24 Hours (1 Day)</option>
              <option value={2}>Last 48 Hours (2 Days)</option>
              <option value={5}>Last 5 Days</option>
              <option value={7}>Last 7 Days (1 Week)</option>
            </select>
          </div>

          {/* Region Preset Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-400">Sector:</span>
            <select
              value={selectedRegionPreset}
              onChange={(e) => setSelectedRegionPreset(e.target.value)}
              className="bg-slate-900 border border-white/10 text-slate-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="australia">Northern Australia Savanna</option>
              <option value="all">Global Multi-Sector</option>
              <option value="us">Western United States</option>
              <option value="amazon">Amazon Basin & Cerrado</option>
            </select>
          </div>
        </div>

        {/* Status / Notice Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE TELEMETRY ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              DEMO TELEMETRY FIXTURES
            </span>
          )}
          {lastFetchTime && (
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              Fetched: {new Date(lastFetchTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Backend Notice or Offline Banner if any */}
      {notice && (
        <div className="p-3 rounded-lg bg-slate-900/90 border border-white/8 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{notice}</span>
          </div>
          {error && (
            <button
              onClick={() => loadData(true)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline shrink-0 cursor-pointer"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <KpiCards kpis={kpis} isLive={isLive} />

      {/* Main Interactive Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Live Geospatial Hotspot Sensor Matrix
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Click any fire node to inspect radiance & coordinates
          </span>
        </div>

        <FireMap
          heightClass="h-[480px]"
          selectedHotspot={selectedHotspot}
          onHotspotSelect={(hotspot) => setSelectedHotspot(hotspot)}
          observations={observations}
          isLive={isLive}
        />
      </div>

      {/* Trend Analysis and Regional Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTrendChart />
        <RegionalBreakdown />
      </div>

      {/* Spacecraft Constellation Status */}
      <ConstellationStatus />

      {/* Detailed Hotspot Log Table */}
      <HotspotTable
        hotspots={observations}
        onSelectHotspot={(hotspot) => {
          setSelectedHotspot(hotspot);
          window.scrollTo({ top: 320, behavior: "smooth" });
        }}
        isLive={isLive}
      />
    </div>
  );
}
