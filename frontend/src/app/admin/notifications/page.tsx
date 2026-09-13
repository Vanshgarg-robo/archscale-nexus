"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { AdminNotification } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getRelativeTime } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  user_created: "◈",
  user_deleted: "✕",
  user_disabled: "⊘",
  radar_node_offline: "⌁",
  radar_node_online: "◎",
  database_issue: "⚠",
  high_alert_target: "🔴",
};

export default function AdminNotificationsPage() {
  const authUser = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.admin.notifications.list({ limit: 100 });
      setNotifications(res.notifications);
      setTotal(res.total);
      setUnreadCount(res.unread_count);
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    if (authUser?.role !== "admin") return;
    fetchNotifications();
  }, [authUser]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.admin.notifications.markRead(id);
      setNotifications(notifications.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch { }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.admin.notifications.markAllRead();
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { }
    setMarkingAll(false);
  };

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-orange-400">🔔</span> Admin Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {total} notifications • {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {markingAll ? "Marking..." : "Mark All as Read"}
          </button>
        )}
      </div>

      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        {notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No Notifications" message="No admin notifications to display." />
        ) : (
          <div className="divide-y divide-slate-800/50">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3 transition-colors ${n.is_read ? "opacity-60" : "bg-slate-900/20"}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${n.is_read ? "bg-slate-800/50 border border-slate-700/50" : "bg-orange-500/15 border border-orange-500/30"}`}>
                  {TYPE_ICONS[n.notification_type] || "◈"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${n.is_read ? "text-slate-400" : "text-white"}`}>{n.title}</p>
                      {n.message && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{n.created_at ? getRelativeTime(n.created_at) : ""}</span>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-slate-400 uppercase">
                      {n.notification_type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
