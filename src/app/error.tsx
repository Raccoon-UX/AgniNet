"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AgniNet Telemetry Error:", error);
  }, [error]);

  return (
    <div className="py-20 flex items-center justify-center">
      <ErrorState
        title="Orbital Stream Failure"
        message={error.message || "An unexpected error occurred while parsing geospatial fire data buffers."}
        onRetry={reset}
      />
    </div>
  );
}
