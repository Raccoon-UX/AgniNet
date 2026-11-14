import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFRP(frp: number | null | undefined): string {
  if (frp == null) {
    return "N/A";
  }
  if (frp >= 1000) {
    return `${(frp / 1000).toFixed(1)}k MW`;
  }
  return `${frp.toFixed(1)} MW`;
}

export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

export function formatDMS(lat: number, lon: number): string {
  const toDMS = (deg: number, isLat: boolean) => {
    const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
    const absDeg = Math.abs(deg);
    const d = Math.floor(absDeg);
    const minFloat = (absDeg - d) * 60;
    const m = Math.floor(minFloat);
    const s = ((minFloat - m) * 60).toFixed(1);
    return `${d}° ${m}' ${s}" ${dir}`;
  };
  return `${toDMS(lat, true)}, ${toDMS(lon, false)}`;
}

export function getFRPColor(frp: number | null | undefined): {
  badge: string;
  glow: string;
  hex: string;
  label: "Low" | "Moderate" | "High" | "Extreme" | "Unrated";
} {
  if (frp == null) {
    return {
      badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      glow: "",
      hex: "#94a3b8",
      label: "Unrated",
    };
  }
  if (frp >= 200) {
    return {
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.5)]",
      hex: "#ef4444",
      label: "Extreme",
    };
  }
  if (frp >= 80) {
    return {
      badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      glow: "shadow-[0_0_12px_rgba(249,115,22,0.4)]",
      hex: "#f97316",
      label: "High",
    };
  }
  if (frp >= 30) {
    return {
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      hex: "#f59e0b",
      label: "Moderate",
    };
  }
  return {
    badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    glow: "shadow-[0_0_8px_rgba(234,179,8,0.2)]",
    hex: "#eab308",
    label: "Low",
  };
}

export function getSensorBadgeClass(sensor: "MODIS" | "VIIRS" | "HARMONIZED"): string {
  switch (sensor) {
    case "VIIRS":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    case "MODIS":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "HARMONIZED":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30 ring-1 ring-amber-400/40";
    default:
      return "bg-slate-700/50 text-slate-300 border-slate-600";
  }
}
