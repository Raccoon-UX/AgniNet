"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DEMO_ALERTS } from "@/data/fixtures";
import { FireAlert } from "@/types/fire";
import { formatFRP, formatCoordinates } from "@/lib/utils";
import {
  ExternalLink,
  CheckCircle2,
  Send,
} from "lucide-react";
import Link from "next/link";

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [webhookUrl, setWebhookUrl] = useState<string>("https://api.emergency.gov/v1/wildfire-webhooks");
  const [webhookSaved, setWebhookSaved] = useState<boolean>(false);

  const filteredAlerts = DEMO_ALERTS.filter((alert) => {
    if (severityFilter === "ALL") return true;
    return alert.severity === severityFilter;
  });

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 3000);
  };

  const getSeverityBadge = (severity: FireAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "advisory":
        return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Early Warning System"
        title="Active Megafire Escalation & Critical Alerts"
        description="Automated satellite fire detection alerts prioritized by Fire Radiative Power (FRP), rate of spread, and high-value ecological boundary proximity."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {DEMO_ALERTS.length} CRITICAL ACTIVE NOTICES
            </span>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-white/8 text-xs">
          <button
            onClick={() => setSeverityFilter("ALL")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              severityFilter === "ALL"
                ? "bg-slate-700 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Severities ({DEMO_ALERTS.length})
          </button>
          <button
            onClick={() => setSeverityFilter("critical")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              severityFilter === "critical"
                ? "bg-red-500/20 text-red-300 border border-red-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setSeverityFilter("high")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              severityFilter === "high"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            High
          </button>
          <button
            onClick={() => setSeverityFilter("medium")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              severityFilter === "medium"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Medium / Advisory
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          DISPATCH PROTOCOL: CAP v1.2 &bull; GEOJSON STREAM
        </span>
      </div>

      {/* Alerts Feed List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl glass-panel p-5 space-y-3 relative overflow-hidden border border-white/8 hover:border-orange-500/40 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getSeverityBadge(
                    alert.severity
                  )}`}
                >
                  {alert.severity}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-300">
                  {alert.id}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {alert.timestamp.slice(0, 10)} &bull; {alert.timestamp.slice(11, 16)} UTC
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-orange-400">
                  {formatFRP(alert.frpMw)} Peak FRP
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({alert.affectedAreaKm2} km² perimeter)
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <h4 className="text-base font-bold text-white tracking-tight">
                  {alert.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {alert.summary}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                  <span>
                    Location: <strong className="text-slate-200">{alert.region}</strong>
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">
                    Coordinates: {formatCoordinates(alert.coordinates[0], alert.coordinates[1])}
                  </span>
                  <span>&bull;</span>
                  <span>
                    Source: <strong className="text-cyan-300">{alert.sensorSource}</strong>
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href={`/map?lat=${alert.coordinates[0]}&lon=${alert.coordinates[1]}&zoom=8`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer"
                >
                  <span>View Hotspot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Dispatch & Integration Demo Box */}
      <div className="rounded-xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">
            Emergency Dispatch Webhook & API Ingestion Settings (Demo)
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Configure real-time Common Alerting Protocol (CAP) or GeoJSON webhook push endpoints to notify incident response centers, forestry teams, and disaster command units immediately when thermal anomalies exceed defined FRP thresholds.
        </p>

        <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-domain.gov/api/v1/wildfire-push"
            className="flex-1 px-3.5 py-2 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-500/50"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            {webhookSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Endpoint Saved!</span>
              </>
            ) : (
              <span>Save Dispatch Hook</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
