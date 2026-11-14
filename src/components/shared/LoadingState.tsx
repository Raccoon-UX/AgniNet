import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "Acquiring Satellite Telemetry...",
  description = "Harmonizing MODIS and VIIRS active fire observations.",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl glass-panel ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border border-orange-500/20 flex items-center justify-center bg-orange-500/10">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-orange-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">{description}</p>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-orange-400/80 bg-orange-500/5 px-3 py-1 rounded-full border border-orange-500/15">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        DEMO PIPELINE &bull; SYNTHETIC BUFFER STREAM
      </div>
    </div>
  );
};
