import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Telemetry Acquisition Error",
  message = "Failed to stream or parse synthetic satellite hotspot observations. Please verify network or reload data buffers.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-red-500/25 bg-red-950/20 backdrop-blur-md ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/10 mb-4 text-red-400">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-red-200">{title}</h3>
      <p className="mt-1 text-xs text-red-300/80 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/30 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Acquisition
        </button>
      )}
    </div>
  );
};
