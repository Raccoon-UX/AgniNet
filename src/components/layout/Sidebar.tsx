"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Calendar,
  BarChart3,
  Layers,
  Flame,
  Info,
  ChevronLeft,
  ChevronRight,
  Radio,
  Satellite,
  Activity,
} from "lucide-react";
import { MAIN_NAVIGATION, NavigationItem } from "@/types/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const getIcon = (name: string) => {
    switch (name) {
      case "LayoutDashboard":
        return <LayoutDashboard className="w-5 h-5 shrink-0" />;
      case "Globe":
        return <Globe className="w-5 h-5 shrink-0" />;
      case "Calendar":
        return <Calendar className="w-5 h-5 shrink-0" />;
      case "BarChart3":
        return <BarChart3 className="w-5 h-5 shrink-0" />;
      case "Layers":
        return <Layers className="w-5 h-5 shrink-0" />;
      case "Flame":
        return <Flame className="w-5 h-5 shrink-0" />;
      case "Info":
        return <Info className="w-5 h-5 shrink-0" />;
      default:
        return <Activity className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0a0f1d] border-r border-white/8 transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/8 bg-[#090e1b]">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-white" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#0a0f1d] animate-ping opacity-75" />
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white group-hover:text-orange-400 transition-colors">
                    AgniNet
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    2026
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate tracking-wide">
                  Satellite Fire Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Constellation Health Bar */}
        {!collapsed && (
          <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-300">
                Constellation Status
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              5/5 ACTIVE
            </span>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {MAIN_NAVIGATION.map((item: NavigationItem) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-300 border border-orange-500/30 shadow-sm shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-orange-500" />
                )}

                <div
                  className={`${
                    isActive
                      ? "text-orange-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {getIcon(item.iconName)}
                </div>

                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-orange-500/15 text-orange-300 border border-orange-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Mission Telemetry Summary Footer */}
        <div className="p-3 border-t border-white/8 bg-[#090e1b]">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                  MODIS &bull; VIIRS Harmonized
                </span>
                <span className="font-mono text-cyan-400">Phase 1</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-orange-500 h-full w-full" />
              </div>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                NASA Space Apps Challenge 2026
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="NASA Space Apps 2026">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
