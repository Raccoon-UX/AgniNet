export interface NavigationItem {
  name: string;
  href: string;
  iconName: string;
  badge?: string;
  description: string;
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    name: "Overview",
    href: "/",
    iconName: "LayoutDashboard",
    description: "Executive geospatial fire intelligence summary and KPIs",
  },
  {
    name: "Global Fire Map",
    href: "/map",
    iconName: "Globe",
    badge: "Interactive",
    description: "MapLibre-powered high-resolution multi-sensor fire layer",
  },
  {
    name: "Activity Calendar",
    href: "/calendar",
    iconName: "Calendar",
    description: "Diurnal fire cycles, seasonal burn regimes and calendar heatmaps",
  },
  {
    name: "Historical Analysis",
    href: "/historical",
    iconName: "BarChart3",
    description: "Multi-year fire intensity, emissions modeling and biome impacts",
  },
  {
    name: "Sensor Comparison",
    href: "/sensors",
    iconName: "Layers",
    description: "MODIS (1km) vs VIIRS (375m) cross-calibration and harmonization",
  },
  {
    name: "Intelligence Alerts",
    href: "/alerts",
    iconName: "Flame",
    badge: "5 Active",
    description: "Megafire escalation alerts, boundary anomalies and push rules",
  },
  {
    name: "About AgniNet",
    href: "/about",
    iconName: "Info",
    description: "NASA Space Apps Challenge 2026 concept and science framework",
  },
];
