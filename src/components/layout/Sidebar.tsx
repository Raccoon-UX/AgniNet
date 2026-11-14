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
  Satellite,
  Radio,
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
        return <LayoutDashboard className="w-4 h-4 shrink-0" />;
      case "Globe":
        return <Globe className="w-4 h-4 shrink-0" />;
      case "Calendar":
        return <Calendar className="w-4 h-4 shrink-0" />;
      case "BarChart3":
        return <BarChart3 className="w-4 h-4 shrink-0" />;
      case "Layers":
        return <Layers className="w-4 h-4 shrink-0" />;
      case "Flame":
        return <Flame className="w-4 h-4 shrink-0" />;
      case "Info":
        return <Info className="w-4 h-4 shrink-0" />;
      default:
        return <Radio className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ease-in-out ${
          collapsed ? "w-16" : "w-60"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-200 bg-slate-50">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 overflow-hidden group"
          >
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-slate-900">
                    AgniNet
                  </span>
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-200 text-slate-700">
                    2026
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 truncate tracking-wide">
                  Satellite Fire Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Button (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Platform Views
            </div>
          )}

          {MAIN_NAVIGATION.map((item: NavigationItem) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white font-medium shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span className={isActive ? "text-orange-400" : "text-slate-500"}>
                  {getIcon(item.iconName)}
                </span>

                {!collapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}

          {/* Mission Context & Constellation Info (Desktop Expanded Only) */}
          {!collapsed && (
            <div className="pt-3 mt-3 border-t border-slate-200 px-2 space-y-3">
              {/* Mission Context */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mission Context
                </div>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-[#0b3d91] text-white flex items-center justify-center text-[8px] font-black shrink-0">
                      NASA
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 leading-none">
                        NASA FIRMS
                      </div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">
                        Fire Information System
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Data Sources
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-mono font-medium">
                        MODIS (Terra/Aqua)
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-mono font-medium">
                        VIIRS (S-NPP/NOAA-20/21)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Constellation Quick Monitor */}
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex items-center justify-between text-slate-400 uppercase tracking-wider font-semibold">
                  <span className="flex items-center gap-1">
                    <Satellite className="w-3 h-3 text-slate-500" />
                    Constellation
                  </span>
                  <span className="text-emerald-700 text-[9px]">5 ACTIVE</span>
                </div>
                <div className="text-slate-500 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Terra &bull; Aqua</span>
                    <span className="text-slate-700">1000m AM/PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SNPP &bull; N20 &bull; N21</span>
                    <span className="text-sky-700">375m I-Band</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / System Meta */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          {!collapsed ? (
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>AgniNet-Harmonize v1.1.1</span>
              </div>
              <span className="text-slate-400">2026</span>
            </div>
          ) : (
            <div className="flex justify-center text-[9px] font-mono text-emerald-700">
              ● v1.1
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
