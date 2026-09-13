"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { SystemHealth } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function getHealthColor(connected: boolean): string {
  return connected ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30";
}

export default function SystemMonitoringPage() {
  const authUser = useAuthStore((s) => s.user);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      const data = await api.admin.systemHealth();
      setHealth(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authUser?.role !== "admin") return;
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  if (authUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⊘</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Access Denied</h3>
        <p className="text-xs text-slate-500">Administrator privileges required.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (error || !health) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⚠</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Monitoring Error</h3>
        <p className="text-xs text-slate-500">{error || "Failed to load system health data"}</p>
      </div>
    );
  }

  const metrics = [
    { label: "Server Uptime", value: formatUptime(health.server_uptime_seconds), icon: "⏱", color: "emerald" },
    { label: "Database Latency", value: `${health.database_response_ms}ms`, icon: "⚡", color: health.database_response_ms < 100 ? "emerald" : health.database_response_ms < 500 ? "amber" : "red" },
    { label: "Total Users", value: health.total_users.toLocaleString(), icon: "◉", color: "blue" },
    { label: "Active Users", value: health.active_users.toLocaleString(), icon: "◈", color: "emerald" },
    { label: "Online Sessions", value: health.online_sessions.toLocaleString(), icon: "⬡", color: "orange" },
    { label: "Radar Nodes", value: health.radar_nodes_connected.toLocaleString(), icon: "◎", color: "amber" },
    { label: "Targets Tracked", value: health.targets_tracked.toLocaleString(), icon: "⧫", color: "red" },
    { label: "Alerts Generated", value: health.alerts_generated.toLocaleString(), icon: "⌁", color: "amber" },
    { label: "Reports Generated", value: health.reports_generated.toLocaleString(), icon: "☵", color: "blue" },
    { label: "Error Count", value: health.error_count.toLocaleString(), icon: "⚠", color: health.error_count === 0 ? "emerald" : "red" },
    { label: "Memory Usage", value: `${health.memory_usage_mb} MB`, icon: "◐", color: health.memory_usage_mb < 512 ? "emerald" : health.memory_usage_mb < 1024 ? "amber" : "red" },
    { label: "CPU Usage", value: `${health.cpu_usage_percent}%`, icon: "⟡", color: health.cpu_usage_percent < 50 ? "emerald" : health.cpu_usage_percent < 80 ? "amber" : "red" },
  ];

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "from-blue-500/10 to-blue-600/5", text: "text-blue-400", border: "border-blue-500/20" },
    emerald: { bg: "from-emerald-500/10 to-emerald-600/5", text: "text-emerald-400", border: "border-emerald-500/20" },
    orange: { bg: "from-orange-500/10 to-orange-600/5", text: "text-orange-400", border: "border-orange-500/20" },
    amber: { bg: "from-amber-500/10 to-amber-600/5", text: "text-amber-400", border: "border-amber-500/20" },
    red: { bg: "from-red-500/10 to-red-600/5", text: "text-red-400", border: "border-red-500/20" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-orange-400">◐</span> System Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time system health • Auto-refreshes every 30s • Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
        >
          ↻ Refresh Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`bg-[#0B1120] border rounded-xl p-4 flex items-center justify-between ${getHealthColor(health.database_connected)}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${health.database_connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs font-semibold text-white">Database</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getHealthColor(health.database_connected)}`}>
            {health.database_connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="bg-[#0B1120] border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">API Server</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            {health.api_status}
          </span>
        </div>
        <div className="bg-[#0B1120] border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">WebSocket</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {metrics.map(({ label, value, icon, color }) => {
          const s = colorStyles[color] || colorStyles.emerald;
          return (
            <div key={label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
                  <p className={`text-lg font-bold mt-1 ${s.text}`}>{value}</p>
                </div>
                <span className="text-sm opacity-40">{icon}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
