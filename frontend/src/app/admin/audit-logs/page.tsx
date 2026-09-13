"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { AuditLog, AuditLogListResponse } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";

const ACTION_TYPES = [
  "user_created", "user_updated", "user_deleted", "user_enabled",
  "user_disabled", "password_reset", "role_changed", "login", "logout",
];

export default function AuditLogsPage() {
  const authUser = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res: AuditLogListResponse = await api.admin.auditLogs.list({
        page, page_size: 50, search: search || undefined,
        action: actionFilter || undefined, status: statusFilter || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch { }
    setLoading(false);
  }, [page, search, actionFilter, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (authUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⊘</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Access Denied</h3>
        <p className="text-xs text-slate-500">Administrator privileges required.</p>
      </div>
    );
  }

  const formatAction = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="text-orange-400">☵</span> Audit Logs
        </h1>
        <p className="text-xs text-slate-400 mt-1">{total} events recorded • Searchable system log</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by action or resource..."
            className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.map((a) => <option key={a} value={a}>{formatAction(a)}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        {loading ? <LoadingSpinner /> : logs.length === 0 ? (
          <EmptyState icon="☵" title="No Audit Logs" message="No events match the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resource</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">IP Address</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white truncate">{log.user_name || "System"}</p>
                        <p className="text-[10px] text-slate-500 truncate">{log.user_email || "—"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-300">{log.resource_type}</p>
                      {log.resource_id && <p className="text-[10px] text-slate-500">ID: {log.resource_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 font-mono hidden lg:table-cell">{log.ip_address || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${log.status === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-400 hidden md:table-cell whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">Page {page} of {totalPages} • {total} total events</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 disabled:opacity-30 cursor-pointer transition-colors">←</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 disabled:opacity-30 cursor-pointer transition-colors">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
