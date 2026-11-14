"use client";

import React, { useState } from "react";
import { HotspotObservation } from "@/types/fire";
import { formatCoordinates, formatDMS } from "@/lib/utils";
import {
  Copy,
  Check,
  Satellite,
  Flame,
  Thermometer,
  Calendar,
  Crosshair,
  Sun,
  Moon,
  Compass,
  Grid,
  ShieldCheck,
  X,
  Layers,
} from "lucide-react";

interface ObservationInspectorProps {
  observation: HotspotObservation | null;
  onClose?: () => void;
  className?: string;
}

export const ObservationInspector: React.FC<ObservationInspectorProps> = ({
  observation,
  onClose,
  className = "",
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  if (!observation) {
    return (
      <div className={`sci-card p-5 text-center text-xs text-slate-500 bg-white ${className}`}>
        <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-400">
          <Satellite className="w-5 h-5" />
        </div>
        <p className="font-semibold text-slate-700">Observation Details</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Select any active fire pixel on the map or registry table to inspect radiometric and orbital telemetry.
        </p>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(observation.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(
      `${observation.latitude.toFixed(5)}, ${observation.longitude.toFixed(5)}`
    );
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const isVIIRS = observation.sensor === "VIIRS";
  const tempDiff =
    observation.brightnessKelvin != null && observation.brightT31Kelvin != null
      ? (observation.brightnessKelvin - observation.brightT31Kelvin).toFixed(1)
      : null;

  return (
    <div className={`sci-card p-4 space-y-3.5 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
            Observation Details
          </h3>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close observation inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sensor and Type Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
            isVIIRS
              ? "bg-sky-50 text-sky-800 border border-sky-300"
              : "bg-purple-50 text-purple-800 border border-purple-300"
          }`}
        >
          {observation.sensor} &bull; {observation.satellite}
        </span>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-orange-50 text-orange-800 border border-orange-300">
          Fire Pixel
        </span>

        {observation.isHarmonizedMatch && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-indigo-50 text-indigo-800 border border-indigo-300">
            Dual Match
          </span>
        )}
      </div>

      {/* Observation Telemetry Table */}
      <div className="divide-y divide-slate-100 text-[11px] font-mono border border-slate-200 rounded-md overflow-hidden bg-slate-50/50">
        {/* Observation ID */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-slate-400" />
            Observation ID
          </span>
          <button
            onClick={handleCopyId}
            title="Click to copy ID"
            className="inline-flex items-center gap-1 text-slate-800 font-bold hover:text-blue-600 cursor-pointer"
          >
            <span className="truncate max-w-[150px]">{observation.id}</span>
            {copiedId ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Acquisition Time (UTC) */}
        <div className="p-2 flex items-center justify-between">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Acquisition Time (UTC)
          </span>
          <span className="text-slate-900 font-medium">
            {observation.acquisitionDate} {observation.acquisitionTimeUtc ?? "00:00:00"}
          </span>
        </div>

        {/* Decimal Coordinates */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-slate-400" />
            Coordinates
          </span>
          <button
            onClick={handleCopyCoords}
            title="Click to copy Lat/Lon"
            className="inline-flex items-center gap-1 text-slate-900 font-medium hover:text-blue-600 cursor-pointer"
          >
            <span>{formatCoordinates(observation.latitude, observation.longitude)}</span>
            {copiedCoords ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 shrink-0" />
            )}
          </button>
        </div>

        {/* DMS Coordinates */}
        <div className="p-2 flex items-center justify-between">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            DMS
          </span>
          <span className="text-slate-700 text-[10px]">
            {formatDMS(observation.latitude, observation.longitude)}
          </span>
        </div>

        {/* Day / Night */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            {observation.dayNight === "D" ? (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            Day/Night
          </span>
          <span className="text-slate-800">
            {observation.dayNight === "D"
              ? "Day (Daytime overpass)"
              : observation.dayNight === "N"
              ? "Night (Nighttime overpass)"
              : "Ascending/Descending"}
          </span>
        </div>

        {/* Fire Radiative Power (FRP) */}
        <div className="p-2 flex items-center justify-between bg-orange-50/40">
          <span className="text-slate-700 font-sans text-[11px] font-semibold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-600" />
            Fire Radiative Power (FRP)
          </span>
          <span className="text-orange-700 font-bold text-xs">
            {observation.frpMw != null ? `${observation.frpMw.toFixed(1)} MW` : "N/A"}
          </span>
        </div>

        {/* Brightness Temperature */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-slate-400" />
            Brightness Temperature
          </span>
          <span className="text-slate-900 font-semibold">
            {observation.brightnessKelvin != null ? `${observation.brightnessKelvin.toFixed(1)} K` : "N/A"}
          </span>
        </div>

        {/* Background Temp T31 */}
        <div className="p-2 flex items-center justify-between">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-slate-400" />
            Background Temp (T31)
          </span>
          <span className="text-slate-800">
            {observation.brightT31Kelvin != null ? `${observation.brightT31Kelvin.toFixed(1)} K` : "N/A"}
          </span>
        </div>

        {/* Thermal Contrast */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-slate-400" />
            Thermal Contrast (&Delta;T)
          </span>
          <span className="text-slate-900 font-semibold">
            {tempDiff != null ? `${tempDiff} K` : "N/A"}
          </span>
        </div>

        {/* Scan Angle */}
        <div className="p-2 flex items-center justify-between">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            Scan Angle (Nadir)
          </span>
          <span className="text-slate-800">
            {observation.scanAngle != null ? `${observation.scanAngle.toFixed(1)}°` : "26.3°"}
          </span>
        </div>

        {/* Track */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-slate-400" />
            Track (Across &times; Along)
          </span>
          <span className="text-slate-800 text-[10px]">
            {observation.trackKm != null
              ? `${(observation.trackKm * 1000).toFixed(0)} m × 386 m`
              : isVIIRS
              ? "375 m × 375 m"
              : "1000 m × 1000 m"}
          </span>
        </div>

        {/* Confidence */}
        <div className="p-2 flex items-center justify-between">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Confidence (FIRMS)
          </span>
          <span className="text-emerald-700 font-semibold">
            {observation.confidence != null ? `${observation.confidence}%` : "High"}
          </span>
        </div>

        {/* Provenance */}
        <div className="p-2 flex items-center justify-between bg-white">
          <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Source / Provenance
          </span>
          <span
            className={`font-semibold ${
              observation.isLive ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {observation.isLive ? "NASA FIRMS (Live)" : "Demo Fixture"}
          </span>
        </div>
      </div>
    </div>
  );
};
