"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Clock,
  Download,
} from "lucide-react";
import { HotspotObservation } from "@/types/fire";

interface TopNavProps {
  onOpenMobileMenu: () => void;
  collapsed: boolean;
  isLive?: boolean;
  dataSource?: "NASA_FIRMS_LIVE" | "DEMO_FIXTURES";
  lastFetchTime?: string;
  observations?: HotspotObservation[];
  onSearchChange?: (term: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenMobileMenu,
  isLive = false,
  dataSource = "DEMO_FIXTURES",
  lastFetchTime,
  observations = [],
}) => {
  const [utcTime, setUtcTime] = useState<string>("");
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  useEffect(() => {
    const updateUtc = () => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(0, 19).replace("T", " ") + " UTC");
    };
    updateUtc();
    const interval = setInterval(updateUtc, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLiveActive = isLive || dataSource === "NASA_FIRMS_LIVE";

  const handleExportGeoJSON = () => {
    const targetHotspots = observations.length > 0 ? observations : [];
    const geojson = {
      type: "FeatureCollection",
      metadata: {
        title: isLiveActive ? "AgniNet NASA FIRMS Live Telemetry Extract" : "AgniNet Synthetic Fire Telemetry Extract",
        generatedAt: new Date().toISOString(),
        isLive: isLiveActive,
        dataSource: dataSource,
        attribution: isLiveActive
          ? "NASA FIRMS (LANCE / EOSDIS) • MODIS & VIIRS Telemetry"
          : "AgniNet Synthetic Fixtures • NASA Space Apps Challenge 2026",
      },
      features: targetHotspots.map((h) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [h.longitude, h.latitude],
        },
        properties: {
          id: h.id,
          sensor: h.sensor,
          sensorSource: h.sensorSource,
          satellite: h.satellite,
          frpMw: h.frpMw,
          brightnessKelvin: h.brightnessKelvin,
          brightT31Kelvin: h.brightT31Kelvin,
          confidence: h.confidence,
          acquisitionDate: h.acquisitionDate,
          acquisitionTimeUtc: h.acquisitionTimeUtc,
          region: h.region,
          country: h.country,
          isLive: h.isLive ?? isLiveActive,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agninet-${isLiveActive ? "firms-live" : "synthetic"}-extract-${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
    URL.revokeObjectURL(url);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumbs / Platform Identifier */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900 tracking-tight">AgniNet</span>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-[11px] text-slate-500 uppercase tracking-wider">
              EO Fire Radiometry
            </span>
            <span className="text-slate-300">/</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              NASA Space Apps 2026
            </span>
          </div>
        </div>

        {/* Center: Live UTC Clock & Freshness */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{utcTime || "UTC CLOCK"}</span>
          </div>

          {lastFetchTime && (
            <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-500">
              <span>Updated:</span>
              <span className="text-slate-700">{new Date(lastFetchTime).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Right: Data Source Status & Export Action */}
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          {isLiveActive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="hidden sm:inline">NASA FIRMS LIVE</span>
              <span className="sm:hidden">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span className="hidden sm:inline">DEMO FIXTURES</span>
              <span className="sm:hidden">DEMO</span>
            </div>
          )}

          {/* Export Action */}
          <button
            onClick={handleExportGeoJSON}
            title="Export GeoJSON of current observation buffer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Export GeoJSON</span>
          </button>

          {exportNotice && (
            <span className="text-[11px] font-mono text-emerald-700 hidden sm:inline animate-fade-in">
              GeoJSON Downloaded
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
