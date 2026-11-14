"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { ActivityTrendChart } from "@/components/dashboard/ActivityTrendChart";
import { HotspotTable } from "@/components/dashboard/HotspotTable";
import { RegionalBreakdown } from "@/components/dashboard/RegionalBreakdown";
import { ConstellationStatus } from "@/components/dashboard/ConstellationStatus";
import { ObservationInspector } from "@/components/dashboard/ObservationInspector";
import { FireMap } from "@/components/map/FireMap";
import { DEMO_KPIS, DEMO_HOTSPOTS } from "@/data/fixtures";
import { HotspotKpis, HotspotObservation } from "@/types/fire";
import { fetchObservations } from "@/lib/api";
import { RefreshCw, AlertCircle, Filter, Calendar, Layers, MapPin } from "lucide-react";
import Link from "next/link";

export default function OverviewPage() {
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotObservation | null>(DEMO_HOTSPOTS[0]);
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
      if (result.observations.length > 0) {
        setSelectedHotspot(result.observations[0]);
      }
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
          if (result.observations.length > 0) {
            setSelectedHotspot(result.observations[0]);
          }
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
      {/* Platform Section Header */}
      <PageHeader
        badge="Earth Observation / Radiometric Fire Intelligence"
        title="Active Satellite Fire Telemetry"
        description="Near real-time fusion of NASA MODIS (Terra/Aqua 1km) and VIIRS (Suomi-NPP/NOAA-20/21 375m) active fire radiometry, automated spatial harmonization, and radiative power quantification."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-600 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span>{refreshing ? "Syncing..." : "Sync Feeds"}</span>
            </button>

            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>Full Map Explorer</span>
            </Link>
          </div>
        }
      />

      {/* Filter and Telemetry Control Strip */}
      <div className="sci-card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sensor Feed Selector */}
          <div className="flex items-center gap-1.5 text-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Sensor:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-slate-500"
            >
              <option value="ALL">All Sensors (Merged)</option>
              <option value="VIIRS">VIIRS Constellation (375m)</option>
              <option value="MODIS">MODIS Terra & Aqua (1000m)</option>
              <option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20 (375m)</option>
              <option value="VIIRS_NOAA21_NRT">VIIRS NOAA-21 (375m)</option>
              <option value="VIIRS_SNPP_NRT">VIIRS Suomi-NPP (375m)</option>
              <option value="MODIS_NRT">MODIS NRT (1000m)</option>
            </select>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Window:</span>
            <select
              value={selectedDayRange}
              onChange={(e) => setSelectedDayRange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-slate-500"
            >
              <option value={1}>Past 24 Hours</option>
              <option value={2}>Past 48 Hours</option>
              <option value={5}>Past 5 Days</option>
              <option value={7}>Past 7 Days</option>
            </select>
          </div>

          {/* Region Preset Selector */}
          <div className="flex items-center gap-1.5 text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Sector:</span>
            <select
              value={selectedRegionPreset}
              onChange={(e) => setSelectedRegionPreset(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-slate-500"
            >
              <option value="all">Global Multi-Sector</option>
              <option value="australia">Northern Australia Savanna</option>
              <option value="us">Western United States</option>
              <option value="amazon">Amazon Basin & Cerrado</option>
            </select>
          </div>
        </div>

        {/* Status / Notice Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              NASA FIRMS LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              DEMO FIXTURES BUFFER
            </span>
          )}
          {lastFetchTime && (
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              Sync: {new Date(lastFetchTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Notice Banner if any */}
      {notice && (
        <div className="p-3 rounded-md bg-slate-100 border border-slate-300 text-xs text-slate-700 flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
            <span>{notice}</span>
          </div>
          {error && (
            <button
              onClick={() => loadData(true)}
              className="text-[11px] font-mono text-slate-900 underline shrink-0 cursor-pointer"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* Compact Telemetry Strip */}
      <KpiCards kpis={kpis} isLive={isLive} />

      {/* Main Geospatial Workspace Dominated by Map + Inspector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-600" />
            <h2 className="font-semibold text-slate-900 uppercase tracking-wider text-xs">
              Geospatial Hotspot Radiometry Canvas
            </h2>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Click any fire node to inspect radiance, brightness & coordinates
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Map Canvas (3 columns) */}
          <div className="lg:col-span-3">
            <FireMap
              heightClass="h-[520px]"
              selectedHotspot={selectedHotspot}
              onHotspotSelect={(hotspot) => setSelectedHotspot(hotspot)}
              observations={observations}
              isLive={isLive}
            />
          </div>

          {/* Observation Telemetry Inspector (1 column) */}
          <div className="lg:col-span-1">
            <ObservationInspector
              observation={selectedHotspot}
              className="h-[520px] overflow-y-auto"
            />
          </div>
        </div>
      </div>

      {/* Trends & Regional Regimes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTrendChart />
        <RegionalBreakdown />
      </div>

      {/* Spacecraft Constellation Status */}
      <ConstellationStatus
        detectedSatellites={kpis.detectedSatellites}
        activeFeedCount={kpis.activeFeedCount}
        totalFeedCount={kpis.totalFeedCount}
        isLive={isLive}
      />

      {/* Detailed Observation Registry Table */}
      <HotspotTable
        hotspots={observations}
        onSelectHotspot={(hotspot) => {
          setSelectedHotspot(hotspot);
          window.scrollTo({ top: 340, behavior: "smooth" });
        }}
        isLive={isLive}
      />
    </div>
  );
}
