"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Download,
  Bell,
  RefreshCw,
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
        {/* Left: Mobile Toggle & Scientific Platform Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                NASA Fire Monitoring Platform
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
              MODIS (1 km) &amp; VIIRS (375 m) &bull; Harmonized Fire Observations &bull; Radiative Analysis
            </span>
          </div>
        </div>

        {/* Right: Data Source Status, Last Update, Refresh, Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Indicator */}
          {isLiveActive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="hidden sm:inline">NASA FIRMS LIVE</span>
              <span className="sm:hidden">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span className="hidden sm:inline">DEMO FIXTURES</span>
              <span className="sm:hidden">DEMO</span>
            </div>
          )}

          {/* Last Update */}
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <span>Last Update:</span>
            <span className="text-slate-700 font-medium">
              {lastFetchTime ? new Date(lastFetchTime).toUTCString().slice(5, 22) + " UTC" : utcTime}
            </span>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => window.location.reload()}
            title="Refresh telemetry"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Notification Icon */}
          <button
            title="Thermal anomaly notifications"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          {/* User Avatar */}
          <div
            title="Scientific Operator Session"
            className="w-7 h-7 rounded-full bg-[#3b82f6] text-white flex items-center justify-center font-bold text-xs shadow-xs"
          >
            S
          </div>

          {/* Export Action */}
          <button
            onClick={handleExportGeoJSON}
            title="Export GeoJSON of current observation buffer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GeoJSON</span>
          </button>

          {exportNotice && (
            <span className="text-[11px] font-mono text-emerald-700 hidden lg:inline animate-fade-in">
              GeoJSON Downloaded
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
