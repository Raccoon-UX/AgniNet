"use client";

import React, { useState } from "react";
import { HotspotObservation } from "@/types/fire";
import { formatCoordinates } from "@/lib/utils";
import { Copy, Check, Satellite, ShieldCheck, X } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

  if (!observation) {
    return (
      <div className={`sci-card p-5 text-center text-xs text-slate-500 ${className}`}>
        <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-400">
          <Satellite className="w-5 h-5" />
        </div>
        <p className="font-medium text-slate-700">No Observation Selected</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Select any thermal node on the map or from the observation table to inspect detailed radiometric telemetry.
        </p>
      </div>
    );
  }

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${observation.latitude.toFixed(5)}, ${observation.longitude.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVIIRS = observation.sensor === "VIIRS";
  const tempDiff =
    observation.brightnessKelvin != null && observation.brightT31Kelvin != null
      ? (observation.brightnessKelvin - observation.brightT31Kelvin).toFixed(1)
      : null;

  return (
    <div className={`sci-card p-4 sm:p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                isVIIRS
                  ? "bg-sky-50 text-sky-800 border border-sky-300"
                  : "bg-purple-50 text-purple-800 border border-purple-300"
              }`}
            >
              {observation.sensor} &bull; {observation.satellite}
            </span>
            {observation.isHarmonizedMatch && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-800 border border-indigo-300">
                DUAL-SENSOR MATCH
              </span>
            )}
          </div>
          <h3 className="mt-1 font-mono font-bold text-sm text-slate-900 tracking-tight">
            {observation.id}
          </h3>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Geospatial Coordinates & Location */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
            Coordinates & Biome
          </span>
          <button
            onClick={handleCopyCoords}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>{copied ? "Copied" : "Copy Lat/Lon"}</span>
          </button>
        </div>

        <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-800">
            <span>Decimal:</span>
            <span className="font-semibold">{formatCoordinates(observation.latitude, observation.longitude)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 text-[11px]">
            <span>Sector:</span>
            <span>{observation.region}, {observation.country}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[10px]">
            <span>Land Cover:</span>
            <span>{observation.landCover}</span>
          </div>
        </div>
      </div>

      {/* Radiometric Telemetry Matrix */}
      <div className="space-y-1.5">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 block">
          Thermal Radiometry
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* FRP */}
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">Fire Radiative Power</span>
            <span className="text-base font-bold font-mono text-orange-700">
              {observation.frpMw != null ? `${observation.frpMw.toFixed(1)} MW` : "N/A"}
            </span>
          </div>

          {/* Fire Brightness (T21/T4) */}
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">Brightness (Kelvin)</span>
            <span className="text-base font-bold font-mono text-slate-900">
              {observation.brightnessKelvin != null ? `${observation.brightnessKelvin.toFixed(1)} K` : "N/A"}
            </span>
          </div>

          {/* Background Temp (T31/T5) */}
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">Background (T31)</span>
            <span className="font-mono text-xs text-slate-800 font-semibold">
              {observation.brightT31Kelvin != null ? `${observation.brightT31Kelvin.toFixed(1)} K` : "N/A"}
            </span>
          </div>

          {/* Thermal Contrast */}
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">Thermal Contrast (&Delta;T)</span>
            <span className="font-mono text-xs text-slate-800 font-semibold">
              {tempDiff != null ? `+${tempDiff} K` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Orbital & Optical Geometry */}
      <div className="space-y-1.5">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 block">
          Orbital & Optical Geometry
        </span>

        <div className="p-2.5 rounded bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Acquisition (UTC)</span>
            <span className="font-semibold text-slate-900">
              {observation.acquisitionDate} {observation.acquisitionTimeUtc ?? "00:00"}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Day / Night Pass</span>
            <span className="font-semibold text-slate-900">
              {observation.dayNight === "D" ? "Daytime (Solar)" : observation.dayNight === "N" ? "Nighttime" : "Ascending/Desc"}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Scan Angle</span>
            <span className="text-slate-800">
              {observation.scanAngle != null ? `${observation.scanAngle.toFixed(2)}°` : "Nadir"}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Ground Track</span>
            <span className="text-slate-800">
              {observation.trackKm != null ? `${observation.trackKm.toFixed(2)} km` : isVIIRS ? "0.375 km" : "1.00 km"}
            </span>
          </div>
        </div>
      </div>

      {/* Provenance Verification Footer */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>PROVENANCE:</span>
          <span className="font-semibold text-slate-700">
            {observation.isLive ? "NASA EOSDIS LANCE NRT" : "SYNTHETIC DEMO ARCHIVE"}
          </span>
        </div>
        <span>CONFIDENCE: {observation.confidence != null ? `${observation.confidence}%` : "NOMINAL"}</span>
      </div>
    </div>
  );
};
