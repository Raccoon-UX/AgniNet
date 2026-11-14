"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Flame,
  Satellite,
  ShieldCheck,
  Cpu,
  ExternalLink,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        badge="Mission Architecture / Technical Dossier"
        title="About AgniNet"
        description="A NASA Space Apps Challenge 2026 platform harmonizing multi-sensor spaceborne radiometry for next-generation wildfire early warning and energy quantification."
      />

      {/* Hero Mission Statement */}
      <div className="sci-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold">
            NASA Space Apps Challenge 2026 &bull; Wildfire Intelligence Track
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          The Challenge: Harmonizing Fragmented Orbital Radiometry
        </h2>

        <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
          Earth observation satellites detect active wildfires from polar orbit through mid-wave and thermal infrared sensors.
          However, disaster response agencies and environmental scientists face a fragmented data ecosystem:
          <strong> NASA MODIS</strong> (Terra/Aqua) provides an indispensable 25-year climate baseline at 1000m nadir resolution,
          while <strong>VIIRS</strong> (Suomi-NPP/NOAA-20/21) captures fires at 375m high spatial resolution with different scan geometries,
          radiometric saturation thresholds, and revisit timings.
        </p>

        <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
          <strong>AgniNet</strong> implements a scientifically defensible geospatial harmonization pipeline that deduplicates overlapping observations,
          preserves sensor-specific Fire Radiative Power (MW) without invalid cross-sensor summation, resolves pixel-scale spatial discrepancies,
          and presents an integrated satellite fire intelligence dashboard for incident commanders, climate modelers, and forestry agencies.
        </p>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="sci-card p-5 space-y-2.5">
          <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-center">
            <Satellite className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Spatio-Temporal Harmonization</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ingests heterogeneous telemetry streams from MODIS (MOD14/MYD14) and VIIRS (VNP14IMGTDL/VJ114IMGTDL) and aligns them into a harmonized coordinate lattice using dynamic footprint modeling.
          </p>
        </div>

        <div className="sci-card p-5 space-y-2.5">
          <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-800 border border-purple-200 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Strict Radiative Flux Separation</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Preserves MODIS (4.0 µm) and VIIRS (3.74 µm) Fire Radiative Power strictly separately, rejecting unscientific hybrid sums while computing normalized comparative indices.
          </p>
        </div>

        <div className="sci-card p-5 space-y-2.5">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Open Science & Provenance Trust</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enforces server-authoritative provenance verification, cryptographically separating verified NASA FIRMS live streams from synthetic demo fixtures.
          </p>
        </div>
      </div>

      {/* Data Source & Scientific Attribution Section */}
      <div className="sci-card p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Data Sources & Scientific Attribution
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          AgniNet queries Near Real-Time (NRT) active fire datasets operated by NASA Land, Atmosphere Near real-time Capability for EOS (LANCE) Fire Information for Resource Management System (FIRMS), part of the NASA Earth Observing System Data and Information System (EOSDIS).
        </p>
        <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-slate-600">
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-800 hover:text-slate-900 underline"
          >
            <span>NASA FIRMS Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://earthdata.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-800 hover:text-slate-900 underline"
          >
            <span>NASA Earthdata</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.spaceappschallenge.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-800 hover:text-slate-900 underline"
          >
            <span>NASA Space Apps Challenge 2026</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
