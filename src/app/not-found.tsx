import Link from "next/link";
import { Compass, RotateCcw } from "lucide-react";

export default function NotFound() {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-center rounded-xl glass-panel p-8">
      <div className="w-14 h-14 rounded-full border border-orange-500/30 flex items-center justify-center bg-orange-500/10 mb-4 text-orange-400">
        <Compass className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-white">404 &bull; Coordinates Out of Swath</h2>
      <p className="mt-2 text-xs text-slate-400 max-w-sm leading-relaxed">
        The requested satellite route or telemetry sector does not exist within the active orbital flight plan.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 transition-all shadow-md shadow-orange-600/20"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Return to Mission Overview
      </Link>
    </div>
  );
}
