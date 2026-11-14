"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

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
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isLiveActive = isLive || dataSource === "NASA_FIRMS_LIVE";

  if (isLiveActive) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-900 relative z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <p className="truncate">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-emerald-800 mr-1.5">
                NASA FIRMS Live Feed Connected:
              </span>
              Streaming Near Real-Time active fire radiometry from NASA EOSDIS LANCE (Terra/Aqua MODIS and Suomi-NPP/NOAA-20/21 VIIRS).
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
              VERIFIED NASA LIVE
            </span>
            <button
              onClick={() => setDismissed(true)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded transition-colors cursor-pointer"
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
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
          <p className="truncate">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-800 mr-1.5">
              Synthetic Demonstration Fixtures:
            </span>
            {notice ||
              "Displaying synthetic fixtures modeled after NASA FIRMS schemas. Active fire detections reflect simulated radiometry, not confirmed ground fires."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
            DEMO / SYNTHETIC
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-900 p-0.5 rounded transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
