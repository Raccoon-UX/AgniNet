"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { DemoNoticeBanner } from "./DemoNoticeBanner";
import { HotspotObservation } from "@/types/fire";

interface AppShellProps {
  children: React.ReactNode;
  isLive?: boolean;
  dataSource?: "NASA_FIRMS_LIVE" | "DEMO_FIXTURES";
  lastFetchTime?: string;
  notice?: string | null;
  observations?: HotspotObservation[];
  onSearchChange?: (term: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  isLive = false,
  dataSource = "DEMO_FIXTURES",
  lastFetchTime,
  notice,
  observations = [],
  onSearchChange,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      {/* Top Notice Banner */}
      <DemoNoticeBanner
        isLive={isLive}
        dataSource={dataSource}
        notice={notice}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Top App Header */}
      <TopNav
        collapsed={collapsed}
        onOpenMobileMenu={() => setMobileOpen(true)}
        isLive={isLive}
        dataSource={dataSource}
        lastFetchTime={lastFetchTime}
        observations={observations}
        onSearchChange={onSearchChange}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col`}
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>

        {/* Global Footer */}
        <footer className="mt-auto border-t border-white/5 py-4 px-6 text-center text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <p>
              AgniNet &bull; Unified Satellite Fire Intelligence &bull; NASA Space Apps Challenge 2026
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              NASA FIRMS MODIS (1km) & VIIRS (375m) Telemetry Harmonization Engine
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};
