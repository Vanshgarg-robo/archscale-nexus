"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import type { Notification } from "@/types";

export default function AlertsPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [alerts, setAlerts] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadAlerts = () => {
    setLoading(true);
    api.notifications
      .list(projectId)
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, [projectId]);

  const handleMarkRead = async (alertId: number) => {
    try {
      await api.notifications.markRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
    } catch {
    }
  };

  if (loading) return <LoadingSpinner />;

  const filteredAlerts =
    filter === "all"
      ? alerts
      : filter === "unread"
      ? alerts.filter((a) => !a.is_read)
      : alerts.filter((a) => a.notification_type.toLowerCase() === filter.toLowerCase());

  const getAlertIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "approval_required":
        return "◇";
      case "blocker_detected":
        return "⊘";
      case "change_impact":
        return "⟐";
      case "risk_escalation":
        return "△";
      case "dependency_failure":
        return "⧫";
      default:
        return "◉";
    }
  };

  const getAlertColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "blocker_detected":
      case "risk_escalation":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "approval_required":
      case "dependency_failure":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "change_impact":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      default:
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Coordination Alert System</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automated, AI-grounded explanations informing cross-disciplinary teams of cascading project impacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            {alerts.filter((a) => !a.is_read).length} Unread Alerts
          </div>
          <button
            onClick={loadAlerts}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
          >
            ↻ Refresh Feed
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "unread", "approval_required", "blocker_detected", "change_impact", "dependency_failure"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === tab
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                  : "text-slate-400 bg-slate-900/60 border border-slate-800 hover:text-white"
              }`}
            >
              {tab === "all"
                ? "All Alerts"
                : tab === "unread"
                ? "Unread Only"
                : tab.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          )
        )}
      </div>

      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
            <p className="text-sm text-slate-400">No alerts match the selected filter.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-slate-900/60 border rounded-xl p-5 transition-all ${
                alert.is_read ? "border-slate-800/80 opacity-75" : "border-slate-700 shadow-sm shadow-orange-500/5"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm shrink-0 font-bold ${getAlertColor(
                      alert.notification_type
                    )}`}
                  >
                    {getAlertIcon(alert.notification_type)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
                      {!alert.is_read && (
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mt-0.5">
                      {alert.notification_type.replace(/_/g, " ")}
                    </span>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-3xl">
                      {alert.message}
                    </p>
                    <span className="text-[11px] text-slate-500 block mt-3">
                      {alert.created_at ? new Date(alert.created_at).toLocaleString() : "Real-time trigger"}
                    </span>
                  </div>
                </div>

                {!alert.is_read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs rounded-lg transition-colors cursor-pointer self-start shrink-0"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
