import Link from "next/link";
import { Compass, RotateCcw } from "lucide-react";

export default function NotFound() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center sci-card p-8">
      <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 mb-3 text-slate-500">
        <Compass className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">404 &bull; Coordinates Out of Swath</h2>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
        The requested satellite route or telemetry sector does not exist within the active orbital flight plan.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Return to Mission Overview
      </Link>
    </div>
  );
}
