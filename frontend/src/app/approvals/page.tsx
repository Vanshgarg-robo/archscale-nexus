"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Approval } from "@/types";

export default function ApprovalsPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [activeTab, setActiveTab] = useState<"pending" | "overdue" | "history">("pending");
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [overdueApprovals, setOverdueApprovals] = useState<Approval[]>([]);
  const [historyApprovals, setHistoryApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.approvals.pending(projectId),
      api.approvals.overdue(projectId),
      api.approvals.history(projectId),
    ])
      .then(([pending, overdue, hist]) => {
        setPendingApprovals(pending);
        setOverdueApprovals(overdue);
        setHistoryApprovals(hist);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleDecision = async (approvalId: number, decision: "approved" | "rejected") => {
    setActionLoading(approvalId);
    try {
      await api.approvals.update(approvalId, {
        status: decision,
        notes: `Decision recorded via Approvals Command Center on ${new Date().toLocaleDateString()}`,
      });
      loadData();
    } catch {
    }
    setActionLoading(null);
  };

  if (loading) return <LoadingSpinner />;

  const currentList =
    activeTab === "pending"
      ? pendingApprovals
      : activeTab === "overdue"
      ? overdueApprovals
      : historyApprovals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Approval Intelligence</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Multi-role governance enforcing client, architect, PM, and vendor sign-offs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-slate-400 bg-slate-900 border border-slate-800 hover:text-white"
            }`}
          >
            Pending ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overdue"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "text-slate-400 bg-slate-900 border border-slate-800 hover:text-white"
            }`}
          >
            Overdue ({overdueApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-slate-400 bg-slate-900 border border-slate-800 hover:text-white"
            }`}
          >
            History ({historyApprovals.length})
          </button>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-amber-400 text-lg shrink-0">⊘</span>
        <div>
          <h3 className="text-xs font-semibold text-amber-300">
            Downstream Execution Protection Active
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tasks with missing or unapproved parent sign-offs are locked automatically. Physical site work, fabrication, and purchase order releases cannot proceed without approved digital verification.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
            <p className="text-sm text-slate-400">No approvals in this view.</p>
          </div>
        ) : (
          currentList.map((appr) => {
            const isOverdue = appr.is_overdue || (appr.status === "pending" && activeTab === "overdue");
            return (
              <div
                key={appr.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-orange-400 font-mono">#{appr.id}</span>
                      <h3 className="text-sm font-semibold text-white truncate">{appr.title}</h3>
                      <StatusBadge status={appr.status} size="sm" />
                      {isOverdue && (
                        <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                          Overdue ({appr.days_overdue || 1}d)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs text-slate-400">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Type</span>
                        <span className="text-slate-300 font-medium capitalize">
                          {appr.approval_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Assigned Approver</span>
                        <span className="text-white font-medium">{appr.approver_name || "Assigned Authority"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Due Date</span>
                        <span className="text-slate-300 font-medium">
                          {appr.due_date ? new Date(appr.due_date).toLocaleDateString() : "Unspecified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Requested By</span>
                        <span className="text-slate-300 font-medium">{appr.requester_name || "Project Manager"}</span>
                      </div>
                    </div>
                    {appr.related_task_id && (
                      <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-amber-300">
                        <span>🔒 Blocks Task #{appr.related_task_id} from construction execution</span>
                      </div>
                    )}
                  </div>

                  {appr.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      <button
                        onClick={() => handleDecision(appr.id, "approved")}
                        disabled={actionLoading === appr.id}
                        className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === appr.id ? "Processing..." : "✓ Approve Sign-off"}
                      </button>
                      <button
                        onClick={() => handleDecision(appr.id, "rejected")}
                        disabled={actionLoading === appr.id}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
