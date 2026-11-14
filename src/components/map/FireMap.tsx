"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HotspotObservation, SensorType } from "@/types/fire";
import { DEMO_HOTSPOTS } from "@/data/fixtures";
import { formatCoordinates } from "@/lib/utils";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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

type BasemapStyle = "dark" | "light" | "satellite";

const BASEMAP_TILES: Record<BasemapStyle, { url: string; attribution: string }> = {
  dark: {
    url: "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &bull; HERE, Garmin, OpenStreetMap",
  },
  light: {
    url: "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &bull; HERE, Garmin, OpenStreetMap",
  },
  satellite: {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &bull; Earthstar Geographics",
  },
};

export const FireMap: React.FC<FireMapProps> = ({
  initialCenter = [0, 20],
  initialZoom = 2,
  heightClass = "h-[540px]",
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
  const [basemap, setBasemap] = useState<BasemapStyle>("dark");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);

  const activeHotspots = observations && observations.length > 0 ? observations : DEMO_HOTSPOTS;

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const tileInfo = BASEMAP_TILES["dark"];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "base-tiles": {
            type: "raster",
            tiles: [tileInfo.url],
            tileSize: 256,
            attribution: tileInfo.attribution,
          },
        },
        layers: [
          {
            id: "base-tiles-layer",
            type: "raster",
            source: "base-tiles",
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
      setZoomLevel(map.getZoom());
    });

    map.on("mousemove", (e) => {
      setCursorCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    map.on("zoom", () => {
      if (mapInstance.current) {
        setZoomLevel(mapInstance.current.getZoom());
      }
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Switch basemap layer dynamically
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    const map = mapInstance.current;
    const tileInfo = BASEMAP_TILES[basemap];

    const style = map.getStyle();
    if (style && style.sources && style.sources["base-tiles"]) {
      const source = map.getSource("base-tiles") as maplibregl.RasterTileSource;
      if (source && typeof source.setTiles === "function") {
        source.setTiles([tileInfo.url]);
      }
    }
  }, [basemap, mapLoaded]);

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

    // Add crisp scientific markers
    visibleHotspots.forEach((hotspot) => {
      const frpVal = hotspot.frpMw ?? 0;
      const isHarmonized = hotspot.isHarmonizedMatch;
      const isVIIRS = hotspot.sensor === "VIIRS";

      // Color coding: VIIRS = Cyan, MODIS = Purple, High FRP = Burnt Orange/Red
      let markerColor = isVIIRS ? "#0284c7" : "#7c3aed";
      if (frpVal > 300) markerColor = "#dc2626";
      else if (frpVal > 100) markerColor = "#ea580c";

      // Size calculation
      const size = frpVal > 300 ? 16 : frpVal > 100 ? 13 : 9;

      const el = document.createElement("div");
      el.className = "cursor-pointer transition-transform hover:scale-125 flex items-center justify-center";
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      if (isHarmonized) {
        // Dual-sensor matched glyph: outer ring + solid core
        el.innerHTML = `
          <div style="width: ${size + 4}px; height: ${size + 4}px; border-radius: 9999px; border: 2px solid #4f46e5; background-color: ${markerColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.5);">
            <div style="width: 3px; height: 3px; border-radius: 9999px; background-color: #ffffff;"></div>
          </div>
        `;
      } else {
        // Standard observation marker: solid crisp circle with white stroke
        el.innerHTML = `
          <div style="width: ${size}px; height: ${size}px; border-radius: 9999px; background-color: ${markerColor}; border: 1.5px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>
        `;
      }

      // Popup Content
      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px;">
            <span style="font-family: monospace; font-weight: 700; color: #f8fafc;">${hotspot.id}</span>
            <span style="font-family: monospace; font-size: 10px; padding: 2px 5px; border-radius: 3px; background-color: ${markerColor}25; color: ${markerColor}; border: 1px solid ${markerColor}60; font-weight: 600;">
              ${hotspot.frpMw != null ? `${hotspot.frpMw.toFixed(1)} MW FRP` : "FRP N/A"}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px;">
            <div>
              <span style="color: #94a3b8; display: block; font-size: 9px; text-transform: uppercase;">Sensor / Platform</span>
              <span style="color: #f1f5f9; font-weight: 600;">${hotspot.sensor} &bull; ${hotspot.satellite}</span>
            </div>
            <div>
              <span style="color: #94a3b8; display: block; font-size: 9px; text-transform: uppercase;">Brightness Temp</span>
              <span style="color: #f1f5f9; font-family: monospace;">${hotspot.brightnessKelvin != null ? `${hotspot.brightnessKelvin} K` : "N/A"}</span>
            </div>
            <div>
              <span style="color: #94a3b8; display: block; font-size: 9px; text-transform: uppercase;">Confidence</span>
              <span style="color: #10b981; font-family: monospace;">${hotspot.confidence != null ? `${hotspot.confidence}%` : "Standard"}</span>
            </div>
            <div>
              <span style="color: #94a3b8; display: block; font-size: 9px; text-transform: uppercase;">Acquisition UTC</span>
              <span style="color: #f1f5f9; font-family: monospace;">${hotspot.acquisitionTimeUtc ?? hotspot.acquisitionDate}</span>
            </div>
          </div>

          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #334155;">
            <span style="color: #94a3b8; display: block; font-size: 9px; text-transform: uppercase;">Sector Coordinates</span>
            <span style="color: #cbd5e1; font-family: monospace; font-size: 10px;">${formatCoordinates(hotspot.latitude, hotspot.longitude)}</span>
            <span style="color: #94a3b8; font-size: 9px; display: block; margin-top: 2px;">${hotspot.region}, ${hotspot.country}</span>
          </div>

          ${isHarmonized ? `
            <div style="margin-top: 6px; padding: 3px 6px; background-color: #312e81; border: 1px solid #4338ca; border-radius: 3px; color: #c7d2fe; font-size: 9px; font-family: monospace; font-weight: 600; text-align: center;">
              HARMONIZED DUAL-SENSOR EVENT
            </div>
          ` : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 12,
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
  }, [activeHotspots, sensorFilter, minFrp, mapLoaded, onHotspotSelect]);

  // Center on selected hotspot when updated externally
  useEffect(() => {
    if (!mapInstance.current || !selectedHotspot) return;
    mapInstance.current.easeTo({
      center: [selectedHotspot.longitude, selectedHotspot.latitude],
      duration: 800,
    });
  }, [selectedHotspot]);

  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();
  const handleResetView = () => {
    mapInstance.current?.flyTo({
      center: initialCenter,
      zoom: initialZoom,
      duration: 1000,
    });
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-[#0b1329] shadow-sm">
      {/* Top Filter & Layer Bar */}
      {showControlsBar && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-md shadow-sm text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
              Sensor:
            </span>
            <select
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value as SensorType)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-500"
            >
              <option value="ALL">All Sensors</option>
              <option value="VIIRS">VIIRS (375m)</option>
              <option value="MODIS">MODIS (1000m)</option>
              <option value="HARMONIZED">Harmonized Pairs Only</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
              Min FRP:
            </span>
            <select
              value={minFrp}
              onChange={(e) => setMinFrp(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-500"
            >
              <option value={0}>All Radiance (0+ MW)</option>
              <option value={50}>Moderate (50+ MW)</option>
              <option value={100}>High (100+ MW)</option>
              <option value={300}>Severe (300+ MW)</option>
            </select>
          </div>
        </div>
      )}

      {/* Basemap Switcher (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 p-1 rounded-md shadow-sm text-xs">
        <button
          onClick={() => setBasemap("dark")}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            basemap === "dark"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => setBasemap("satellite")}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            basemap === "satellite"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setBasemap("light")}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            basemap === "light"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Light
        </button>
      </div>

      {/* Map Zoom / View Controls (Bottom Right) */}
      <div className="absolute bottom-8 right-3 z-20 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="map-ctrl-btn"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="map-ctrl-btn"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Extent"
          className="map-ctrl-btn"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Coordinates & Scale HUD */}
      <div className="absolute bottom-2 left-3 z-20 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-3">
        <span>
          LAT/LON: {cursorCoords ? `${cursorCoords.lat.toFixed(4)}°, ${cursorCoords.lng.toFixed(4)}°` : "Hover to track"}
        </span>
        <span className="text-slate-500">|</span>
        <span>ZOOM: {zoomLevel.toFixed(1)}</span>
        <span className="text-slate-500">|</span>
        <span>WGS84 &bull; EPSG:3857</span>
        <span className="text-slate-500">|</span>
        <span className={isLive ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
          {isLive ? "NASA FIRMS LIVE" : "DEMO FIXTURES"}
        </span>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-8 left-3 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 rounded-md shadow-sm text-xs text-slate-700 space-y-1.5 hidden md:block">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Legend
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] border border-white" />
            <span>VIIRS (375m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] border border-white" />
            <span>MODIS (1km)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ea580c] border-2 border-[#4f46e5]" />
            <span>Dual Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#dc2626] border border-white" />
            <span>&gt;300 MW</span>
          </div>
        </div>
      </div>

      {/* MapLibre DOM Target */}
      <div ref={mapContainer} className={`w-full ${heightClass}`} />
    </div>
  );
};
