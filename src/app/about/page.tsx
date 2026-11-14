"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Flame,
  Satellite,
  ShieldCheck,
  Cpu,
  Code2,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        badge="Project Overview & Mission Concept"
        title="AgniNet — Unified Satellite Fire Intelligence"
        description="A NASA Space Apps Challenge 2026 initiative harmonizing multi-sensor spaceborne radiometry for next-generation global wildfire early detection and energy quantification."
      />

      {/* Hero Mission Statement */}
      <div className="rounded-xl glass-panel-glow p-6 sm:p-8 space-y-4 border border-orange-500/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Flame className="w-4 h-4" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-orange-400 font-semibold">
            NASA Space Apps Challenge 2026 &bull; Wildfire Intelligence Track
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          The Challenge: Unifying Fragmented Orbital Fire Observations
        </h2>

        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          Earth observation satellites capture active wildfires from space through thermal infrared radiometric sensors.
          However, disaster response agencies and environmental scientists currently face a divided data landscape:
          <strong> NASA MODIS</strong> (Terra/Aqua) provides an indispensable 25-year historical climate baseline at 1km resolution,
          while <strong>VIIRS</strong> (Suomi-NPP/NOAA-20/21) captures fires at 375m high spatial resolution with different scan angles,
          radiometric saturation thresholds, and revisit timings.
        </p>

        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          <strong>AgniNet</strong> introduces a unified geospatial pipeline that deduplicates overlapping observations, cross-calibrates
          Fire Radiative Power (FRP in Megawatts), resolves pixel-scale spatial discrepancies, and presents an integrated, real-time
          wildfire intelligence dashboard for incident responders, climate modelers, and forestry guardians.
        </p>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl glass-panel space-y-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Satellite className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">Cross-Sensor Fusion</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ingests heterogeneous telemetry streams from MODIS (MOD14/MYD14) and VIIRS (VNP14IMGTDL/VJ114IMGTDL) and aligns them into a harmonized spatio-temporal coordinate lattice.
          </p>
        </div>

        <div className="p-5 rounded-xl glass-panel space-y-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">Calibrated Radiative Power</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Standardizes Fire Radiative Power (MW) across different sensor point spread functions to accurately compute total combustion rate, biomass consumption, and atmospheric carbon fluxes.
          </p>
        </div>

        <div className="p-5 rounded-xl glass-panel space-y-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">Open Science & Integrity</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Built strictly on open scientific principles, explicit provenance tracing, and verifiable sensor calibration curves, ensuring actionable decisions without false alarm contamination.
          </p>
        </div>
      </div>

      {/* Data Attribution & Disclaimers */}
      <div className="rounded-xl glass-panel p-6 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Code2 className="w-4 h-4 text-orange-400" />
          Data Sources, Attribution & Phase 1 Scope
        </h3>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
            <strong className="text-white block">NASA FIRMS (Fire Information for Resource Management System):</strong>
            <p className="text-slate-400">
              NASA Near Real-Time (NRT) active fire products are distributed by the Land, Atmosphere Near real-time Capability for EOS (LANCE). Data products include MODIS MCD14DL (1km) and VIIRS VNP14IMGTDL / VJ114IMGTDL (375m).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
            <strong className="text-white block">NOAA Joint Polar Satellite System (JPSS):</strong>
            <p className="text-slate-400">
              Suomi-NPP, NOAA-20, and NOAA-21 operational satellite instrumentation providing day and night thermal infrared observations.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1 text-amber-200/90">
            <strong className="text-amber-300 block">Phase 1 Implementation Note:</strong>
            <p>
              This deployment represents Phase 1 of the AgniNet project. All data records, observations, and telemetry metrics rendered in this interface are synthetic demonstration fixtures modeled strictly on real NASA schema definitions. Live NASA API hooks and machine learning fire propagation models are slated for Phase 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
