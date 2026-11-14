"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Bell,
  Clock,
  Download,
  Search,
  CheckCircle2,
  Radio,
  AlertCircle,
} from "lucide-react";
import { DEMO_ALERTS } from "@/data/fixtures";
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
  collapsed,
  isLive = false,
  dataSource = "DEMO_FIXTURES",
  lastFetchTime,
  observations = [],
  onSearchChange,
}) => {
  const [utcTime, setUtcTime] = useState<string>("");
  const [activeAlertsCount] = useState<number>(DEMO_ALERTS.length);
  const [showAlertMenu, setShowAlertMenu] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<boolean>(false);
  const [searchVal, setSearchVal] = useState<string>("");

  useEffect(() => {
    const updateUtc = () => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 19) + " UTC");
    };
    updateUtc();
    const interval = setInterval(updateUtc, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExportGeoJSON = () => {
    const targetHotspots = observations.length > 0 ? observations : [];
    const geojson = {
      type: "FeatureCollection",
      metadata: {
        title: isLive ? "AgniNet NASA FIRMS Live Observations" : "AgniNet Demo Hotspot Extract",
        generatedAt: new Date().toISOString(),
        isLive: isLive,
        dataSource: dataSource,
        attribution: isLive ? "NASA FIRMS (LANCE/EOSDIS)" : "AgniNet Synthetic Fixtures",
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
          isLive: h.isLive ?? isLive,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agninet-${isLive ? "firms-live" : "demo"}-hotspots-${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
    URL.revokeObjectURL(url);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-[#090e1b]/95 backdrop-blur-md border-b border-white/8 transition-all duration-300 ${
        collapsed ? "lg:pl-20" : "lg:pl-64"
      }`}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Section: Mobile Menu Trigger + Search Box */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchInput}
              placeholder="Search hotspots, biome or region (e.g. Amazon, California)..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs bg-slate-900/80 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50"
            />
          </div>
        </div>

        {/* Right Section: Telemetry Feed Status, Mission Clock, Alerts, GeoJSON Export */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live vs Demo Telemetry Badge */}
          {isLive ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold"
              title={`Live stream from NASA FIRMS. Last fetch: ${lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : "just now"}`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden md:inline">LIVE NASA FIRMS</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-medium"
              title="Running in Demo Mode. To enable live data, set NASA_FIRMS_MAP_KEY in backend/.env"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">DEMO MODE</span>
            </div>
          )}

          {/* Mission UTC Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/8 text-slate-300 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{utcTime || "00:00:00 UTC"}</span>
          </div>

          {/* Alert Center Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAlertMenu(!showAlertMenu)}
              className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              aria-label="View fire alerts"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl glass-panel-elevated shadow-2xl p-4 z-50 border border-white/10">
                <div className="flex items-center justify-between pb-3 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      Critical Intelligence Alerts ({activeAlertsCount})
                    </span>
                  </div>
                  <Link
                    href="/alerts"
                    onClick={() => setShowAlertMenu(false)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-medium"
                  >
                    View All
                  </Link>
                </div>

                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {DEMO_ALERTS.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 hover:border-orange-500/30 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {alert.region}
                        </span>
                        <span className="font-mono text-[10px] text-red-400">
                          {alert.frpMw.toFixed(0)} MW FRP
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                        {alert.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export GeoJSON Button */}
          <button
            onClick={handleExportGeoJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer shadow-sm shadow-orange-500/10"
            title="Download active observations as GeoJSON"
          >
            {exportNotice ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Exported</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export GeoJSON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
