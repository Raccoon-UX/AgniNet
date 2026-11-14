import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Satellite Telemetry Acquisition Error",
  message = "Failed to stream or parse active fire observations. Please verify network connectivity or check FIRMS API status.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-red-200 bg-red-50/50 ${className}`}
      role="alert"
    >
      <div className="w-10 h-10 rounded-full border border-red-200 flex items-center justify-center bg-red-100 mb-3 text-red-600">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-red-900">{title}</h3>
      <p className="mt-1 text-xs text-red-700 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Telemetry Sync
        </button>
      )}
    </div>
  );
};
