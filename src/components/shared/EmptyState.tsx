import React from "react";
import { FilterX, RotateCcw } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Hotspots Found",
  description = "No active satellite detections match your current filter criteria or bounding box.",
  onReset,
  resetLabel = "Reset Filters",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl glass-panel ${className}`}
    >
      <div className="w-12 h-12 rounded-full border border-slate-700/60 flex items-center justify-center bg-slate-800/50 mb-4 text-slate-400">
        <FilterX className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">{description}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {resetLabel}
        </button>
      )}
    </div>
  );
};
