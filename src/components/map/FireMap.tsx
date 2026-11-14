"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ExternalLink,
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
  isDemo?: boolean;
  loading?: boolean;
  error?: string | null;
}

type BasemapStyle = "satellite" | "light" | "dark";

const BASEMAP_TILES: Record<BasemapStyle, { url: string; attribution: string }> = {
  satellite: {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &bull; Earthstar Geographics",
  },
  light: {
    url: "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &bull; HERE, Garmin, OpenStreetMap",
  },
  dark: {
    url: "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &bull; HERE, Garmin, OpenStreetMap",
  },
};

export const FireMap: React.FC<FireMapProps> = ({
  initialCenter = [0, 20],
  initialZoom = 2.5,
  heightClass = "h-[540px]",
  selectedHotspot,
  onHotspotSelect,
  showControlsBar = true,
  observations,
  isLive = false,
  isDemo = false,
  loading = false,
  error = null,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const selectedReticleRef = useRef<maplibregl.Marker | null>(null);

  const [sensorFilter, setSensorFilter] = useState<SensorType>("ALL");
  const [minFrp, setMinFrp] = useState<number>(0);
  const [basemap, setBasemap] = useState<BasemapStyle>("satellite");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);

  // Derive activeHotspots strictly without silent fallback:
  // - If observations array is provided, respect it (including empty array [])
  // - Only render synthetic demo markers when isDemo is explicitly true
  // - Never silently substitute failed or empty live observations with demo fixtures
  const activeHotspots = useMemo(() => {
    if (observations !== undefined) {
      return observations;
    }
    if (isDemo) {
      return DEMO_HOTSPOTS;
    }
    return [];
  }, [observations, isDemo]);

  // Initialize MapLibre GL with default Satellite Basemap
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const tileInfo = BASEMAP_TILES["satellite"];

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

  // Handle container resize automatically
  useEffect(() => {
    if (!mapContainer.current || !mapInstance.current) return;
    const observer = new ResizeObserver(() => {
      mapInstance.current?.resize();
    });
    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, [mapLoaded]);

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
      const size = frpVal > 300 ? 15 : frpVal > 100 ? 12 : 9;

      const el = document.createElement("div");
      el.className = "cursor-pointer transition-transform hover:scale-125 flex items-center justify-center";
      el.style.width = `${size + 4}px`;
      el.style.height = `${size + 4}px`;

      if (isHarmonized) {
        // Dual-sensor matched glyph: outer ring + solid core
        el.innerHTML = `
          <div style="width: ${size + 4}px; height: ${size + 4}px; border-radius: 9999px; border: 2px solid #4f46e5; background-color: ${markerColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.6);">
            <div style="width: 3px; height: 3px; border-radius: 9999px; background-color: #ffffff;"></div>
          </div>
        `;
      } else {
        // Standard observation marker: solid crisp circle with white stroke
        el.innerHTML = `
          <div style="width: ${size}px; height: ${size}px; border-radius: 9999px; background-color: ${markerColor}; border: 1.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.5);"></div>
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
              <span style="color: #10b981; font-family: monospace;">${hotspot.confidence != null ? `${hotspot.confidence}%` : "Not reported"}</span>
            </div>
            <div>
              <span style="color: #94a3b8; display: block; font-size: 9px; text-transform: uppercase;">Acquisition UTC</span>
              <span style="color: #f1f5f9; font-family: monospace;">${hotspot.acquisitionDate ? `${hotspot.acquisitionDate} ` : ""}${hotspot.acquisitionTimeUtc || "Not reported"}</span>
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

  // Render Target Reticle Crosshair around Selected Hotspot (Reference 2 Command Center Style)
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    if (selectedReticleRef.current) {
      selectedReticleRef.current.remove();
      selectedReticleRef.current = null;
    }

    if (!selectedHotspot) return;

    const reticleEl = document.createElement("div");
    reticleEl.className = "pointer-events-none";
    reticleEl.innerHTML = `
      <div style="width: 32px; height: 32px; position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; top: 0; left: 0; width: 7px; height: 7px; border-top: 2px solid #ffffff; border-left: 2px solid #ffffff;"></div>
        <div style="position: absolute; top: 0; right: 0; width: 7px; height: 7px; border-top: 2px solid #ffffff; border-right: 2px solid #ffffff;"></div>
        <div style="position: absolute; bottom: 0; left: 0; width: 7px; height: 7px; border-bottom: 2px solid #ffffff; border-left: 2px solid #ffffff;"></div>
        <div style="position: absolute; bottom: 0; right: 0; width: 7px; height: 7px; border-bottom: 2px solid #ffffff; border-right: 2px solid #ffffff;"></div>
        <div style="width: 14px; height: 14px; border: 1.5px solid #ea580c; border-radius: 9999px;"></div>
      </div>
    `;

    const reticleMarker = new maplibregl.Marker({ element: reticleEl })
      .setLngLat([selectedHotspot.longitude, selectedHotspot.latitude])
      .addTo(mapInstance.current);

    selectedReticleRef.current = reticleMarker;
  }, [selectedHotspot, mapLoaded]);

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
              <option value={0}>All Radiance (&ge; 0 MW)</option>
              <option value={10}>Low (&ge; 10 MW)</option>
              <option value={50}>Moderate (&ge; 50 MW)</option>
              <option value={100}>High (&ge; 100 MW)</option>
              <option value={300}>Severe (&ge; 300 MW)</option>
            </select>
          </div>
        </div>
      )}

      {/* Basemap Switcher (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 p-1 rounded-md shadow-sm text-xs">
        <button
          onClick={() => setBasemap("satellite")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            basemap === "satellite"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setBasemap("light")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            basemap === "light"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Light
        </button>
        <button
          onClick={() => setBasemap("dark")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            basemap === "dark"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Dark
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
      <div className="absolute bottom-2 left-3 right-3 z-20 bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 px-3 py-1 rounded text-[10px] font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>
            LAT: {cursorCoords ? `${cursorCoords.lat.toFixed(4)}°` : "-"} &bull; LON: {cursorCoords ? `${cursorCoords.lng.toFixed(4)}°` : "-"}
          </span>
          <span className="text-slate-600">|</span>
          <span>ZOOM: {zoomLevel.toFixed(1)}</span>
          <span className="text-slate-600">|</span>
          <span>CRS: EPSG:3857 (Web Mercator)</span>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="text-emerald-400 font-semibold">
              NASA FIRMS LIVE ({activeHotspots.length} pixels)
            </span>
          ) : isDemo ? (
            <span className="text-amber-400 font-semibold">
              DEMO FIXTURES ({activeHotspots.length} synthetic pixels)
            </span>
          ) : error ? (
            <span className="text-red-400 font-semibold">
              LIVE API ERROR (0 pixels)
            </span>
          ) : (
            <span className="text-slate-400 font-semibold">
              LIVE FEED ({activeHotspots.length} pixels)
            </span>
          )}
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            title="Open NASA FIRMS Web Portal"
            className="text-slate-400 hover:text-white inline-flex items-center"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 bg-[#0b1329]/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-mono gap-2 pointer-events-none">
          <RotateCcw className="w-4 h-4 animate-spin text-orange-400" />
          <span>Querying Satellite Radiometry Telemetry...</span>
        </div>
      )}

      {/* API Failure Notice Overlay (Strictly shown when live API fails; never silently replaced with demo) */}
      {!loading && error && activeHotspots.length === 0 && (
        <div className="absolute top-14 left-3 right-3 sm:right-auto sm:max-w-md z-20 bg-slate-900/95 border border-red-500/70 rounded-md p-3 text-xs font-mono text-slate-200 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Live Satellite Feed Offline / Error</span>
          </div>
          <p className="text-[11px] text-slate-300">{error}</p>
          <p className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800">
            Rendering 0 observation markers. Silent demo substitution is disabled in live mode.
          </p>
        </div>
      )}

      {/* Empty Buffer Notice Overlay (Quiet period or no detections) */}
      {!loading && !error && activeHotspots.length === 0 && (
        <div className="absolute top-14 left-3 z-20 bg-slate-900/90 border border-slate-700/80 rounded-md px-3 py-2 text-xs font-mono text-slate-300 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-200">Zero Thermal Anomalies Detected</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            No active fire pixels within the selected sector and filter. (Quiet observation period).
          </p>
        </div>
      )}

      {/* Bottom Legend (Reference 1 & 2 Hybrid) */}
      <div className="absolute bottom-8 left-3 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 rounded-md shadow-sm text-xs text-slate-700 space-y-1.5 hidden md:block">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Legend (Active Fire / Thermal Anomaly)
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] border border-white shadow-xs" />
            <span>VIIRS (375m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] border border-white shadow-xs" />
            <span>MODIS (1km)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ea580c] border-2 border-[#4f46e5] shadow-xs" />
            <span>Dual Match</span>
          </div>
          <div className="h-3 w-px bg-slate-300" />
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>FRP:</span>
            <span className="w-2 h-2 rounded-full bg-[#eab308]" title="<10 MW" />
            <span className="w-2 h-2 rounded-full bg-[#f97316]" title="10-50 MW" />
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" title="50-100 MW" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" title=">100 MW" />
          </div>
        </div>
      </div>

      {/* MapLibre DOM Target */}
      <div ref={mapContainer} className={`w-full ${heightClass}`} />
    </div>
  );
};
