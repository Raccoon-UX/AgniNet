"use client";

import React from "react";
import { AlertCircle, Radio, ShieldAlert, X } from "lucide-react";

interface DemoNoticeBannerProps {
  isLive?: boolean;
  notice?: string | null;
  dataSource?: "NASA_FIRMS_LIVE" | "DEMO_FIXTURES";
}

export const DemoNoticeBanner: React.FC<DemoNoticeBannerProps> = ({
  isLive = false,
  notice,
  dataSource = "DEMO_FIXTURES",
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  if (isLive || dataSource === "NASA_FIRMS_LIVE") {
    return (
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-emerald-950/80 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-200/90 backdrop-blur-md relative z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <p className="truncate">
              <strong className="font-semibold text-emerald-300 mr-1.5 uppercase tracking-wider text-[11px]">
                NASA FIRMS Live Feed Active:
              </strong>
              Real Near Real-Time (NRT) satellite observations streamed from NASA EOSDIS LANCE (MODIS & VIIRS).
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE TELEMETRY
            </span>
            <button
              onClick={() => setDismissed(true)}
              className="text-emerald-400/70 hover:text-emerald-300 p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border-b border-amber-500/25 px-4 py-2 text-xs text-amber-200/90 backdrop-blur-md relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5" />
          </span>
          <p className="truncate">
            <strong className="font-semibold text-amber-300 mr-1.5 uppercase tracking-wider text-[11px]">
              Demo Mode:
            </strong>
            {notice ||
              "Showing synthetic fixtures modeling NASA FIRMS MODIS & VIIRS schemas. Configure NASA_FIRMS_MAP_KEY in backend/.env to stream live telemetry."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            DEMO FIXTURES
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400/70 hover:text-amber-300 p-0.5 rounded transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
