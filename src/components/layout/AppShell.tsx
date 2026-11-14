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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
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

      {/* Top Navigation Bar */}
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
        className={`flex-1 transition-all duration-200 ${
          collapsed ? "lg:pl-16" : "lg:pl-60"
        } flex flex-col`}
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>

        {/* Professional Scientific Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">AgniNet</span>
              <span>&bull;</span>
              <span>NASA Space Apps Challenge 2026</span>
              <span>&bull;</span>
              <span>Near Real-Time Satellite Radiometry</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              NASA EOSDIS LANCE FIRMS &bull; MODIS (MOD14/MYD14) &bull; VIIRS (VNP14IMGTDL/VJ114IMGTDL)
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
