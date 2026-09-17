"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Card,
  Empty,
  ErrorNotice,
  formatDate,
  Loading,
  Metric,
  PageHeader,
  Status,
  useRequest,
  Badge,
  Modal,
  emitWorkflowUpdate,
  useWorkflowListener,
} from "@/components/ui";

const REJECTION_REASONS = [
  "Missing information",
  "Needs revision",
  "Incorrect submission",
  "Budget issue",
  "Timeline issue",
  "Quality concerns",
  "Scope mismatch",
  "Other",
];

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const ALLOWED_APPROVE_ROLES = new Set(["admin", "project_manager", "architect", "client"]);

export function TasksPage({ projectId, user }: { projectId: number; user: any }) {
  const tasks = useRequest(() => api.tasks.list(projectId), [projectId]);
  const [activeTab, setActiveTab] = useState("all");
  const [working, setWorking] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("Needs revision");
  const [rejectComments, setRejectComments] = useState("");

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newWeight, setNewWeight] = useState("1.0");

  const canApprove = user?.is_superadmin || ALLOWED_APPROVE_ROLES.has(user?.role);

  // Auto-refresh on workflow events
  useWorkflowListener(useCallback(() => { void tasks.refresh(); }, []));

  const refreshAndEmit = async () => {
    await tasks.refresh();
    emitWorkflowUpdate();
  };

  const handleSubmit = async (taskId: number) => {
    setWorking(taskId);
    try {
      await api.tasks.submit(taskId);
      await refreshAndEmit();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit task");
    } finally {
      setWorking(null);
    }
  };

  const handleApprove = async (taskId: number) => {
    setWorking(taskId);
    try {
      await api.tasks.approve(taskId);
      await refreshAndEmit();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve task");
    } finally {
      setWorking(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setWorking(rejectTarget.id);
    try {
      await api.tasks.reject(rejectTarget.id, {
        reason: rejectReason,
        comments: rejectComments || undefined,
      });
      setRejectTarget(null);
      setRejectReason("Needs revision");
      setRejectComments("");
      await refreshAndEmit();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject task");
    } finally {
      setWorking(null);
    }
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.tasks.create({
        project_id: projectId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        weight: parseFloat(newWeight) || 1.0,
        status: "draft",
      });
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setNewWeight("1.0");
      setShowCreate(false);
      await refreshAndEmit();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  if (tasks.loading) return <Loading text="Loading task matrix…" />;
  if (tasks.error) return <ErrorNotice message={tasks.error} onRetry={() => void tasks.refresh()} />;

  const allTasks = tasks.data || [];
  const filtered = activeTab === "all"
    ? allTasks
    : allTasks.filter((t: any) => t.status === activeTab);

  const approved = allTasks.filter((t: any) => t.status === "approved" || t.status === "completed").length;
  const rejected = allTasks.filter((t: any) => t.status === "rejected").length;
  const pendingApproval = allTasks.filter((t: any) => t.status === "pending_approval" || t.status === "submitted").length;

  return (
    <>
      <PageHeader
        title="Task Matrix"
        description="Create, submit, approve, and reject tasks. Only approved work advances project completion."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost" onClick={() => void tasks.refresh()}>
              Refresh
            </button>
            <button className="button primary" onClick={() => setShowCreate(true)}>
              + New Task
            </button>
          </div>
        }
      />

      <div className="grid cards">
        <Metric label="Total Tasks" value={allTasks.length} icon="📋" />
        <Metric label="Pending Approval" value={pendingApproval} icon="⏳" />
        <Metric label="Approved" value={approved} icon="✅" />
        <Metric label="Rejected" value={rejected} icon="❌" />
      </div>

      {/* Status Filter Tabs */}
      <div className="row" style={{ gap: 6, marginTop: 16, marginBottom: 12, flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "all"
            ? allTasks.length
            : allTasks.filter((t: any) => t.status === tab.key).length;
          return (
            <button
              key={tab.key}
              className={`button small ${activeTab === tab.key ? "primary" : "ghost"}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tasks Table */}
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Weight</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Decision</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ maxWidth: 280 }}>
                    <strong>{t.title}</strong>
                    {t.description && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {t.description.substring(0, 80)}{t.description.length > 80 ? "…" : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>{t.weight ?? 1.0}</td>
                  <td>
                    <Badge
                      label={t.priority}
                      variant={t.priority === "critical" ? "danger" : t.priority === "high" ? "warn" : "default"}
                    />
                  </td>
                  <td style={{ minWidth: 90 }}>
                    <div className="row" style={{ gap: 6, alignItems: "center" }}>
                      <div className="progress" style={{ width: 50 }}>
                        <span style={{ width: `${t.progress}%` }} />
                      </div>
                      <small>{t.progress}%</small>
                    </div>
                  </td>
                  <td>
                    <Status value={t.status} />
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {t.approved_by_name && (
                      <div style={{ color: "var(--success)" }}>
                        ✅ {t.approved_by_name}
                        <br />
                        <small className="muted">{formatDate(t.approved_at)}</small>
                      </div>
                    )}
                    {t.rejected_by_name && (
                      <div style={{ color: "var(--danger)" }}>
                        ❌ {t.rejected_by_name}
                        <br />
                        <Badge label={t.rejection_reason || "Rejected"} variant="danger" />
                        <br />
                        <small className="muted">{formatDate(t.rejected_at)}</small>
                      </div>
                    )}
                    {!t.approved_by_name && !t.rejected_by_name && (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {/* Submit for approval (draft tasks) */}
                      {(t.status === "draft" || t.status === "not_started") && (
                        <button
                          className="button small ghost"
                          disabled={working === t.id}
                          onClick={() => void handleSubmit(t.id)}
                        >
                          {working === t.id ? "…" : "Submit"}
                        </button>
                      )}
                      {/* Approve (pending tasks, authorized roles only) */}
                      {(t.status === "pending_approval" || t.status === "submitted") && canApprove && (
                        <button
                          className="button small primary"
                          disabled={working === t.id}
                          onClick={() => void handleApprove(t.id)}
                        >
                          {working === t.id ? "…" : "Approve"}
                        </button>
                      )}
                      {/* Reject (pending tasks, authorized roles only) */}
                      {(t.status === "pending_approval" || t.status === "submitted") && canApprove && (
                        <button
                          className="button small danger"
                          disabled={working === t.id}
                          onClick={() => setRejectTarget({ id: t.id, title: t.title })}
                        >
                          {working === t.id ? "…" : "Reject"}
                        </button>
                      )}
                      {/* Re-submit rejected tasks */}
                      {t.status === "rejected" && (
                        <button
                          className="button small ghost"
                          disabled={working === t.id}
                          onClick={() => void handleSubmit(t.id)}
                        >
                          {working === t.id ? "…" : "Re-submit"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24 }}>
                    No tasks match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Task Modal */}
      {showCreate && (
        <Modal title="Create New Task" onClose={() => setShowCreate(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 380 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Title *</label>
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title…"
              style={{ padding: "8px 12px" }}
            />
            <label style={{ fontSize: 13, fontWeight: 600 }}>Description</label>
            <textarea
              className="input"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description…"
              rows={3}
              style={{ padding: "8px 12px", resize: "vertical" }}
            />
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Priority</label>
                <select
                  className="input"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  style={{ padding: "8px 12px", width: "100%", marginTop: 4 }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Weight</label>
                <input
                  className="input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  style={{ padding: "8px 12px", width: "100%", marginTop: 4 }}
                />
              </div>
            </div>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="button ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="button primary" disabled={!newTitle.trim()} onClick={() => void handleCreateTask()}>
                Create Task
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Reason Modal */}
      {rejectTarget && (
        <Modal title={`Reject: ${rejectTarget.title}`} onClose={() => setRejectTarget(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 340 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Reason for Rejection</label>
            <select
              className="input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ padding: "8px 12px" }}
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Additional Comments (optional)</label>
            <textarea
              className="input"
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Provide additional context for the rejection…"
              rows={3}
              style={{ padding: "8px 12px", resize: "vertical" }}
            />
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button className="button ghost" onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button
                className="button danger"
                disabled={working === rejectTarget.id}
                onClick={() => void handleRejectSubmit()}
              >
                {working === rejectTarget.id ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
