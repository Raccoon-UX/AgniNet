import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "AgniNet — Unified Satellite Fire Intelligence | NASA Space Apps 2026",
  description:
    "Cross-sensor harmonization platform fusing NASA MODIS (1km) and VIIRS (375m) satellite active fire telemetry for real-time wildfire intelligence and radiative energy quantification.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#070d18]">
      <body className="min-h-screen bg-[#070d18] text-slate-100 antialiased selection:bg-orange-500/30 selection:text-orange-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
