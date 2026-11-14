"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HotspotObservation, SensorType } from "@/types/fire";
import { DEMO_HOTSPOTS, DEMO_REGIONS } from "@/data/fixtures";
import { formatCoordinates, getFRPColor } from "@/lib/utils";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Flame,
} from "lucide-react";

interface FireMapProps {
  initialCenter?: [number, number]; // [lon, lat]
  initialZoom?: number;
  heightClass?: string;
  selectedHotspot?: HotspotObservation | null;
  onHotspotSelect?: (hotspot: HotspotObservation) => void;
  showControlsBar?: boolean;
  observations?: HotspotObservation[];
  isLive?: boolean;
}

export const FireMap: React.FC<FireMapProps> = ({
  initialCenter = [0, 20],
  initialZoom = 2,
  heightClass = "h-[550px]",
  selectedHotspot,
  onHotspotSelect,
  showControlsBar = true,
  observations,
  isLive = false,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [sensorFilter, setSensorFilter] = useState<SensorType>("ALL");
  const [minFrp, setMinFrp] = useState<number>(0);
  const [activeRegion, setActiveRegion] = useState<string>("global");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  const activeHotspots = observations && observations.length > 0 ? observations : DEMO_HOTSPOTS;

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              "&copy; OpenStreetMap contributors &copy; CARTO &bull; AgniNet Demo",
          },
        },
        layers: [
          {
            id: "carto-dark-base",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      mapInstance.current = map;
      setMapLoaded(true);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Update hotspot markers based on filter state
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    const map = mapInstance.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filter hotspots
    const visibleHotspots = activeHotspots.filter((h) => {
      if (minFrp > 0 && (h.frpMw == null || h.frpMw < minFrp)) return false;
      if (sensorFilter === "ALL") return true;
      if (sensorFilter === "HARMONIZED") return h.isHarmonizedMatch;
      if (sensorFilter === "MODIS") return h.sensor === "MODIS";
      if (sensorFilter === "VIIRS") return h.sensor === "VIIRS";
      if (h.sensorSource && h.sensorSource === sensorFilter) return true;
      return h.sensor === sensorFilter;
    });

    // Add custom markers with glowing effects
    visibleHotspots.forEach((hotspot) => {
      const frpColor = getFRPColor(hotspot.frpMw);

      // Create custom DOM element for marker
      const el = document.createElement("div");
      el.className = "cursor-pointer group relative flex items-center justify-center";
      
      const frpVal = hotspot.frpMw ?? 0;
      const size = frpVal > 300 ? 22 : frpVal > 100 ? 18 : 14;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      el.innerHTML = `
        <div class="absolute inset-0 rounded-full animate-ping opacity-60" style="background-color: ${frpColor.hex}; animation-duration: ${frpVal > 400 ? '1.5s' : '3s'};"></div>
        <div class="relative w-full h-full rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center transition-transform group-hover:scale-125" style="background-color: ${frpColor.hex}; box-shadow: 0 0 15px ${frpColor.hex};">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      `;

      // Popup Content
      const popupHtml = `
        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span class="font-mono font-bold text-white">${hotspot.id}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold" style="background-color: ${frpColor.hex}22; color: ${frpColor.hex}; border: 1px solid ${frpColor.hex}44;">
              ${hotspot.frpMw != null ? `${hotspot.frpMw.toFixed(1)} MW FRP` : "FRP Unreported"}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span class="text-slate-400 block text-[10px]">Sensor / Sat</span>
              <span class="font-semibold text-slate-200">${hotspot.sensor} &bull; ${hotspot.satellite}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Brightness Temp</span>
              <span class="font-mono text-slate-200">${hotspot.brightnessKelvin != null ? `${hotspot.brightnessKelvin} K` : "N/A"}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Confidence</span>
              <span class="font-mono text-emerald-400 font-semibold">${hotspot.confidence != null ? `${hotspot.confidence}%` : "Unrated"}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Acquired (UTC)</span>
              <span class="font-mono text-slate-200">${hotspot.acquisitionTimeUtc ?? "Unspecified"}</span>
            </div>
          </div>

          <div class="pt-1.5 border-t border-white/10">
            <span class="text-slate-400 block text-[10px]">Location & Biome</span>
            <span class="text-slate-200 text-[11px] block truncate">${hotspot.region}, ${hotspot.country}</span>
            <span class="text-slate-400 text-[10px] block truncate">${hotspot.landCover}</span>
          </div>

          <div class="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>${formatCoordinates(hotspot.latitude, hotspot.longitude)}</span>
            ${hotspot.isHarmonizedMatch ? '<span class="text-amber-400 font-semibold">DUAL-SENSOR MATCH</span>' : ''}
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: true,
      }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([hotspot.longitude, hotspot.latitude])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("click", () => {
        if (onHotspotSelect) {
          onHotspotSelect(hotspot);
        }
      });

      markersRef.current.push(marker);
    });
  }, [sensorFilter, minFrp, mapLoaded, onHotspotSelect, activeHotspots]);

  // Handle fly to selected hotspot if prop changes
  useEffect(() => {
    if (!mapInstance.current || !selectedHotspot) return;
    mapInstance.current.flyTo({
      center: [selectedHotspot.longitude, selectedHotspot.latitude],
      zoom: 7,
      essential: true,
      duration: 2000,
    });
  }, [selectedHotspot]);

  // Fly to region preset
  const handleFlyToRegion = (regionId: string) => {
    setActiveRegion(regionId);
    if (!mapInstance.current) return;

    if (regionId === "global") {
      mapInstance.current.flyTo({
        center: [0, 20],
        zoom: 2,
        duration: 2000,
      });
      return;
    }

    const reg = DEMO_REGIONS.find((r) => r.regionId === regionId);
    if (reg) {
      mapInstance.current.flyTo({
        center: [reg.centerLon, reg.centerLat],
        zoom: reg.zoomLevel,
        duration: 2000,
      });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 glass-panel shadow-2xl flex flex-col">
      {/* Top Filter Controls Bar */}
      {showControlsBar && (
        <div className="bg-[#090e1b]/95 border-b border-white/8 p-3 flex flex-wrap items-center justify-between gap-3 z-10">
          {/* Sensor Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-300 mr-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              Sensor Layer:
            </span>
            <button
              onClick={() => setSensorFilter("ALL")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                sensorFilter === "ALL"
                  ? "bg-slate-700 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 bg-slate-900/60"
              }`}
            >
              All Sensors
            </button>
            <button
              onClick={() => setSensorFilter("VIIRS")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                sensorFilter === "VIIRS"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                  : "text-slate-400 hover:text-cyan-300 bg-slate-900/60"
              }`}
            >
              VIIRS (375m)
            </button>
            <button
              onClick={() => setSensorFilter("MODIS")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                sensorFilter === "MODIS"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold"
                  : "text-slate-400 hover:text-purple-300 bg-slate-900/60"
              }`}
            >
              MODIS (1km)
            </button>
            <button
              onClick={() => setSensorFilter("HARMONIZED")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                sensorFilter === "HARMONIZED"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-amber-300 bg-slate-900/60"
              }`}
            >
              Harmonized Dual-Pass
            </button>
          </div>

          {/* FRP Sensitivity Slider & Live Status */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {isLive ? (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                NASA FIRMS LIVE
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                DEMO FIXTURES
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Min FRP:</span>
              <input
                type="range"
                min="0"
                max="500"
                step="50"
                value={minFrp}
                onChange={(e) => setMinFrp(Number(e.target.value))}
                className="w-24 accent-orange-500 cursor-pointer"
              />
              <span className="font-mono text-orange-300 w-12 text-right">
                {minFrp > 0 ? `>${minFrp} MW` : "All"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Container Element */}
      <div className={`w-full ${heightClass} relative bg-[#070c17]`}>
        <div ref={mapContainer} className="w-full h-full" />

        {/* Region Presets Floating Pill Bar */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-1.5 p-1.5 bg-[#090e1b]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg max-w-[calc(100%-2rem)]">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            Hot Zones:
          </span>
          <button
            onClick={() => handleFlyToRegion("global")}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              activeRegion === "global"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Global View
          </button>
          {DEMO_REGIONS.map((reg) => (
            <button
              key={reg.regionId}
              onClick={() => handleFlyToRegion(reg.regionId)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeRegion === reg.regionId
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {reg.regionName.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Map Floating Controls (Zoom in / Zoom out / Recenter) */}
        <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-1.5 bg-[#090e1b]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
          <button
            onClick={() => mapInstance.current?.zoomIn()}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstance.current?.zoomOut()}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFlyToRegion("global")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to global view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* FRP Legend Floating Overlay */}
        <div className="absolute bottom-6 left-4 z-10 bg-[#090e1b]/90 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg text-[11px] space-y-1.5 hidden sm:block">
          <span className="font-semibold text-slate-300 block text-[10px] uppercase tracking-wider">
            Fire Radiative Power (MW)
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              <span className="text-slate-400">&lt;30 Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-slate-400">30-80 Mod</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
              <span className="text-slate-400">80-200 High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
              <span className="text-slate-400">&gt;200 Extreme</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
