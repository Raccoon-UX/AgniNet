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
  title = "No Satellite Detections Found",
  description = "No active thermal anomalies match your current spatial, sensor, or threshold filter criteria.",
  onReset,
  resetLabel = "Reset Filters",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-slate-200 bg-white ${className}`}
    >
      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 mb-3 text-slate-400">
        <FilterX className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          {resetLabel}
        </button>
      )}
    </div>
  );
};
