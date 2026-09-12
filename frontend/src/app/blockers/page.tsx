"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { getSeverityIcon } from "@/lib/utils";
import type { BlockerAlert } from "@/types";

export default function BlockersPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [blockers, setBlockers] = useState<BlockerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const loadBlockers = () => {
    setLoading(true);
    api.blockers
      .list(projectId)
      .then((data) => {
        setBlockers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadBlockers();
  }, [projectId]);

  const handleQuickResolve = async (blocker: BlockerAlert) => {
    setResolvingId(blocker.id);
    if (blocker.affected_task_id) {
      try {
        await api.tasks.update(blocker.affected_task_id, {
          status: "in_progress",
        });
      } catch {
      }
    }
    setTimeout(() => {
      setBlockers((prev) => prev.filter((b) => b.id !== blocker.id));
      setResolvingId(null);
    }, 400);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Blocker Detection Engine</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automated bottleneck identification across approvals, overdue milestones, and dependency failures
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {blockers.length} Active Blockers
          </div>
          <button
            onClick={loadBlockers}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
          >
            ↻ Rescan Engine
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 block">Critical Blockers</span>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {blockers.filter((b) => b.severity === "critical" || b.severity === "high").length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Immediate project delay impact</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 block">Missing Approvals</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {blockers.filter((b) => b.blocker_type.includes("approval")).length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Pending stakeholder sign-off</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 block">Dependency Failures</span>
          <p className="text-2xl font-bold text-orange-400 mt-1">
            {blockers.filter((b) => b.blocker_type.includes("dependency") || b.blocker_type.includes("task")).length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Unresolved upstream prerequisites</span>
        </div>
      </div>

      <div className="space-y-3">
        {blockers.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
            <span className="text-3xl text-emerald-400 block mb-2">✓</span>
            <p className="text-sm text-white font-medium">No Active Blockers Detected</p>
            <p className="text-xs text-slate-500 mt-1">
              All tasks and approvals are moving within scheduled tolerance windows.
            </p>
          </div>
        ) : (
          blockers.map((b) => {
            const isCritical = b.severity === "critical" || b.severity === "high";
            return (
              <div
                key={b.id}
                className={`bg-slate-900/60 border rounded-xl p-5 transition-all ${
                  isCritical ? "border-red-500/30 shadow-sm shadow-red-500/5" : "border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getSeverityIcon(b.severity)}</span>
                      <h3 className="text-sm font-semibold text-white truncate">{b.title}</h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {b.blocker_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      <strong>Root Cause:</strong> {b.reason}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                      {b.owner_name && (
                        <div>
                          <span className="text-slate-500">Responsible Owner: </span>
                          <span className="text-white font-medium">{b.owner_name}</span>
                        </div>
                      )}
                      {b.affected_task_title && (
                        <div>
                          <span className="text-slate-500">Impacted Task: </span>
                          <span className="text-orange-300 font-medium">{b.affected_task_title}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Detected: </span>
                        <span className="text-slate-300">
                          {b.created_at ? new Date(b.created_at).toLocaleDateString() : "Active Now"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleQuickResolve(b)}
                      disabled={resolvingId === b.id}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {resolvingId === b.id ? "Unblocking..." : "Initiate Resolution"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
