"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DEMO_ALERTS } from "@/data/fixtures";
import { FireAlert } from "@/types/fire";
import { formatFRP, formatCoordinates } from "@/lib/utils";
import {
  ExternalLink,
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
        return "bg-red-50 text-red-800 border-red-200";
      case "high":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "medium":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "advisory":
        return "bg-yellow-50 text-yellow-800 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        badge="Early Warning / Incident Response Feeds"
        title="Thermal Anomaly Escalation & Critical Alerts"
        description="Automated satellite fire detection notices prioritized by Fire Radiative Power (FRP), rate of thermal expansion, and critical ecological boundary proximity."
        action={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-red-50 text-red-800 border border-red-200 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            {DEMO_ALERTS.length} CRITICAL ACTIVE NOTICES
          </span>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200">
          <button
            onClick={() => setSeverityFilter("ALL")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              severityFilter === "ALL"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Severities ({DEMO_ALERTS.length})
          </button>
          <button
            onClick={() => setSeverityFilter("critical")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              severityFilter === "critical"
                ? "bg-white text-red-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setSeverityFilter("high")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              severityFilter === "high"
                ? "bg-white text-orange-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            High
          </button>
          <button
            onClick={() => setSeverityFilter("medium")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              severityFilter === "medium"
                ? "bg-white text-amber-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
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
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="sci-card p-4 sm:p-5 space-y-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getSeverityBadge(
                    alert.severity
                  )}`}
                >
                  {alert.severity}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900">
                  {alert.id}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {alert.timestamp.slice(0, 10)} &bull; {alert.timestamp.slice(11, 16)} UTC
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-orange-700">
                  {formatFRP(alert.frpMw)} Peak FRP
                </span>
                <span className="text-[11px] text-slate-500">
                  ({alert.affectedAreaKm2} km² perimeter)
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  {alert.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {alert.summary}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                  <span>
                    Sector: <strong className="text-slate-800">{alert.region}</strong>
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">
                    Coordinates: {formatCoordinates(alert.coordinates[0], alert.coordinates[1])}
                  </span>
                  <span>&bull;</span>
                  <span>
                    Sensor: <strong className="text-sky-800">{alert.sensorSource}</strong>
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href={`/map`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  <span>Locate Hotspot</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Dispatch & Integration Demo Box */}
      <div className="sci-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Emergency Dispatch Webhook & Integration Settings
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          Configure real-time Common Alerting Protocol (CAP) or GeoJSON webhook push endpoints to notify incident response centers, forestry teams, and disaster command units immediately when thermal anomalies exceed defined FRP thresholds.
        </p>

        <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-2 max-w-2xl pt-1">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-domain.gov/api/v1/wildfire-push"
            className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-slate-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            {webhookSaved ? "Saved" : "Save Webhook"}
          </button>
        </form>
      </div>
    </div>
  );
}
