"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { AdminDashboardData, AuditLog, AdminNotification } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const METRIC_CARDS = [
  { key: "total_users", label: "Total Users", icon: "◉", color: "blue" },
  { key: "active_users", label: "Active Users", icon: "◈", color: "emerald" },
  { key: "online_users", label: "Online Users", icon: "⬡", color: "orange" },
  { key: "radar_nodes", label: "Radar Nodes", icon: "◎", color: "amber" },
  { key: "targets_tracked", label: "Targets Tracked", icon: "⧫", color: "red" },
  { key: "alerts_generated", label: "Alerts Generated", icon: "⌁", color: "amber" },
  { key: "reports_generated", label: "Reports Generated", icon: "☵", color: "blue" },
] as const;

const STATUS_ITEMS = [
  { key: "database_status", label: "Database" },
  { key: "server_health", label: "Server" },
  { key: "api_health", label: "API" },
] as const;

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "from-blue-500/10 to-blue-600/5", text: "text-blue-400", border: "border-blue-500/20" },
  emerald: { bg: "from-emerald-500/10 to-emerald-600/5", text: "text-emerald-400", border: "border-emerald-500/20" },
  orange: { bg: "from-orange-500/10 to-orange-600/5", text: "text-orange-400", border: "border-orange-500/20" },
  amber: { bg: "from-amber-500/10 to-amber-600/5", text: "text-amber-400", border: "border-amber-500/20" },
  red: { bg: "from-red-500/10 to-red-600/5", text: "text-red-400", border: "border-red-500/20" },
};

function getStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (["connected", "healthy", "operational"].includes(s))
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (["degraded", "warning"].includes(s))
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api.admin.dashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⊘</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Access Denied</h3>
        <p className="text-xs text-slate-500">Administrator privileges required.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⚠</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Error Loading Dashboard</h3>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-orange-400">⬡</span> Administration Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">System overview • Real-time metrics • Operational status</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/users" className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all">
            Manage Users
          </Link>
          <Link href="/admin/monitoring" className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold transition-all">
            System Health
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {METRIC_CARDS.map(({ key, label, icon, color }) => {
          const c = colorMap[color];
          const value = data[key as keyof AdminDashboardData];
          return (
            <div key={key} className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${c.text}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
                </div>
                <span className="text-lg opacity-40">{icon}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STATUS_ITEMS.map(({ key, label }) => {
          const status = String(data[key as keyof AdminDashboardData] || "unknown");
          return (
            <div key={key} className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusStyle(status).includes("emerald") ? "bg-emerald-400 animate-pulse" : getStatusStyle(status).includes("amber") ? "bg-amber-400" : "bg-red-400"}`} />
                <span className="text-xs font-semibold text-white">{label}</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getStatusStyle(status)}`}>
                {status}
              </span>
            </div>
          );
        })}
      </div>

      {data.users_by_role && Object.keys(data.users_by_role).length > 0 && (
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="text-orange-400">◉</span> Users by Role
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {Object.entries(data.users_by_role).map(([role, count]) => (
              <div key={role} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300 capitalize">{role.replace(/_/g, " ")}</span>
                <span className="text-sm font-bold text-orange-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-orange-400">☵</span> Recent Activity
            </h3>
            <Link href="/admin/audit-logs" className="text-[10px] text-orange-400 hover:underline font-mono">View All</Link>
          </div>
          {data.recent_audit_logs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {data.recent_audit_logs.map((log: AuditLog) => (
                <div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                      {log.user_name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{formatAction(log.action)}</p>
                      <p className="text-[10px] text-slate-500 truncate">{log.user_name || "System"} • {log.resource_type}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold shrink-0 ${log.status === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-orange-400">🔔</span> Admin Notifications
            </h3>
            <Link href="/admin/notifications" className="text-[10px] text-orange-400 hover:underline font-mono">View All</Link>
          </div>
          {data.recent_notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No recent notifications</p>
          ) : (
            <div className="space-y-2">
              {data.recent_notifications.map((n: AdminNotification) => (
                <div key={n.id} className={`p-2.5 rounded-xl border text-xs ${n.is_read ? "bg-slate-900/40 border-slate-800/50 text-slate-500" : "bg-slate-800/60 border-slate-700/60 text-slate-300"}`}>
                  <p className="font-semibold text-white text-[11px]">{n.title}</p>
                  {n.message && <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">{n.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", icon: "◉", label: "User Management", desc: "Create, edit, manage users" },
          { href: "/admin/roles", icon: "◇", label: "Role Management", desc: "View & assign permissions" },
          { href: "/admin/audit-logs", icon: "☵", label: "Audit Logs", desc: "Track all system activity" },
          { href: "/admin/settings", icon: "⚙", label: "Settings", desc: "System configuration" },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href} className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 hover:border-orange-500/30 hover:bg-slate-900/50 transition-all group">
            <span className="text-lg text-slate-500 group-hover:text-orange-400 transition-colors">{icon}</span>
            <p className="text-xs font-bold text-white mt-2 group-hover:text-orange-300 transition-colors">{label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
