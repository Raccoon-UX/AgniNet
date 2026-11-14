import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "AgniNet — NASA Space Apps 2026 | Unified Satellite Fire Intelligence",
  description:
    "Cross-sensor harmonization platform fusing NASA MODIS (1km) and VIIRS (375m) satellite active fire radiometry for near real-time thermal anomaly monitoring and energy quantification.",
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
    <html lang="en" className="bg-slate-50 text-slate-900">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-orange-100 selection:text-orange-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
