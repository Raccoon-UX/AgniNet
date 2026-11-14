import { LoadingState } from "@/components/shared/LoadingState";

export default function Loading() {
  return (
    <div className="py-20 flex items-center justify-center">
      <LoadingState
        title="Streaming Satellite Fire Intelligence..."
        description="Synchronizing polar orbit telemetry buffers and harmonizing active thermal hotspots."
      />
    </div>
  );
}
