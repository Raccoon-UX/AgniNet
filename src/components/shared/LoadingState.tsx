import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "Acquiring Satellite Telemetry...",
  description = "Harmonizing MODIS and VIIRS active fire observations across orbital tracks.",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-slate-200 bg-white ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 mb-3 text-slate-700">
        <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
    </div>
  );
};
