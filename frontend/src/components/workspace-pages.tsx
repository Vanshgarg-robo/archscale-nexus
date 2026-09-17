"use client";

import { FormEvent, useState } from "react";
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
} from "@/components/ui";

export function StakeholdersPage({ projectId }: { projectId: number }) {
  const matrix = useRequest(() => api.stakeholders.matrix(projectId), [projectId]);
  const workload = useRequest(() => api.stakeholders.workloads(projectId), [projectId]);

  if (matrix.loading || workload.loading) return <Loading text="Loading stakeholder matrix & workloads…" />;
  if (matrix.error || workload.error) {
    return (
      <ErrorNotice
        message={matrix.error || workload.error}
        onRetry={() => {
          void matrix.refresh();
          void workload.refresh();
        }}
      />
    );
  }

  const people = matrix.data || [];
  const workloads = workload.data || [];

  return (
    <>
      <PageHeader
        title="Stakeholder Intelligence"
        description="Monitor decision authority, responsibility domains, trade workload, and governance bottlenecks across project participants."
      />

      <div className="grid cards">
        <Metric label="Assigned stakeholders" value={people.length} icon="👥" />
        <Metric
          label="Approval authorities"
          value={people.filter((item: any) => item.pending_approvals_count > 0).length}
          hint="with pending decisions"
          icon="✓"
        />
        <Metric
          label="Overloaded contributors"
          value={workloads.filter((item: any) => item.workload_score >= 70).length}
          hint="workload index 70+"
          icon="⚠️"
        />
        <Metric
          label="Open task assignments"
          value={workloads.reduce((sum: number, item: any) => sum + (item.total_tasks || 0), 0)}
          icon="📋"
        />
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Stakeholder Engagement Matrix">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Stakeholder</th>
                  <th>Responsibilities</th>
                  <th>Tasks</th>
                  <th>Approvals</th>
                  <th>Risks</th>
                </tr>
              </thead>
              <tbody>
                {people.map((item: any) => (
                  <tr key={item.stakeholder.id}>
                    <td>
                      <strong>{item.stakeholder.name}</strong>
                      <br />
                      <small className="muted">{item.stakeholder.title || item.stakeholder.email}</small>
                      <div style={{ marginTop: 4 }}>
                        <Status value={item.stakeholder.role} />
                      </div>
                    </td>
                    <td>{item.responsibility_areas || "—"}</td>
                    <td>
                      <strong>{item.assigned_tasks_count}</strong>
                    </td>
                    <td>
                      <span style={{ color: item.pending_approvals_count ? "var(--warn)" : "inherit" }}>
                        {item.pending_approvals_count}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: item.active_risks_count ? "var(--danger)" : "inherit" }}>
                        {item.active_risks_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Workload Radar & Delivery Pressure">
          <div className="list">
            {workloads.map((item: any) => (
              <div key={item.stakeholder_id} className="stack">
                <div className="row between">
                  <div>
                    <strong>{item.name}</strong>
                    <br />
                    <small className="muted">
                      {item.total_tasks} tasks · {item.overdue_tasks} overdue · {item.pending_approvals} approvals
                    </small>
                  </div>
                  <Badge
                    label={`${Math.round(item.workload_score)}%`}
                    variant={item.workload_score >= 70 ? "danger" : item.workload_score >= 40 ? "warn" : "brand"}
                  />
                </div>
                <div className="progress">
                  <span style={{ width: `${Math.min(100, item.workload_score)}%` }} />
                </div>
              </div>
            ))}
            {!workloads.length && <Empty title="No workload data available" />}
          </div>
        </Card>
      </div>
    </>
  );
}

export function DependenciesPage({ projectId }: { projectId: number }) {
  const dependencies = useRequest(() => api.dependencies.list(projectId), [projectId]);
  const critical = useRequest(() => api.dependencies.critical(projectId), [projectId]);

  if (dependencies.loading || critical.loading) return <Loading text="Calculating critical path & dependencies…" />;
  if (dependencies.error || critical.error) {
    return (
      <ErrorNotice
        message={dependencies.error || critical.error}
        onRetry={() => {
          void dependencies.refresh();
          void critical.refresh();
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dependencies & Critical Path"
        description="Trace task handoffs, prerequisites, and critical path exposure before a missed commitment becomes a cascading project delay."
      />

      <div className="grid two">
        <Card title="Critical Path Sequence">
          <div className="flow">
            {critical.data?.map((task: any, index: number) => (
              <div className="flow-node" key={task.task_id || index}>
                <div className="row between">
                  <strong>
                    {index + 1}. {task.task_title}
                  </strong>
                  <Status value={task.status} />
                </div>
                <small className="muted">
                  Duration: {task.estimated_days || 1}d activity · Cumulative critical path:{" "}
                  <strong>{task.cumulative_days} days</strong>
                </small>
              </div>
            ))}
            {!critical.data?.length && (
              <Empty title="No incomplete task sequence">
                All sequenced critical path tasks have either been completed or none are presently defined.
              </Empty>
            )}
          </div>
        </Card>

        <Card title="Task Handoff Relationships">
          <div className="list">
            {dependencies.data?.map((dep: any) => (
              <div className="list-item" key={dep.id}>
                <div>
                  <strong>{dep.target_task_title || `Task #${dep.target_id}`}</strong>
                  <br />
                  <small className="muted">must complete before</small>
                  <br />
                  <strong>{dep.source_task_title || `Task #${dep.source_id}`}</strong>
                </div>
                <Status value={dep.relationship_type} />
              </div>
            ))}
            {!dependencies.data?.length && (
              <Empty title="No dependencies mapped">
                Create dependencies between tasks to establish handoff gates and critical path tracking.
              </Empty>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

export function ApprovalsPage({ projectId }: { projectId: number }) {
  const pending = useRequest(() => api.approvals.pending(projectId), [projectId]);
  const history = useRequest(() => api.approvals.history(projectId), [projectId]);
  const [working, setWorking] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("Needs revision");
  const [rejectComments, setRejectComments] = useState("");

  const refreshAll = async () => {
    await Promise.all([pending.refresh(), history.refresh()]);
    // Emit global event so dashboards auto-refresh
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("archscale:workflow-update"));
    }
  };

  const handleApprove = async (id: number) => {
    setWorking(id);
    try {
      await api.approvals.decide(id, { status: "approved" });
      await refreshAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setWorking(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setWorking(rejectTarget.id);
    try {
      await api.approvals.decide(rejectTarget.id, {
        status: "rejected",
        reason: rejectReason,
        notes: rejectComments || undefined,
      });
      setRejectTarget(null);
      setRejectReason("Needs revision");
      setRejectComments("");
      await refreshAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setWorking(null);
    }
  };

  if (pending.loading || history.loading) return <Loading text="Fetching governance approvals queue…" />;
  if (pending.error || history.error) {
    return (
      <ErrorNotice
        message={pending.error || history.error}
        onRetry={() => {
          void pending.refresh();
          void history.refresh();
        }}
      />
    );
  }

  const overdue = pending.data?.filter((item: any) => item.is_overdue).length || 0;
  const approvedCount = history.data?.filter((item: any) => item.status === "approved").length || 0;
  const rejectedCount = history.data?.filter((item: any) => item.status === "rejected").length || 0;

  return (
    <>
      <PageHeader
        title="Governance Approvals Portal"
        description="Clear accountable decision gates, approve or reject change submissions, and maintain a complete audit sign-off record."
      />

      <div className="grid cards">
        <Metric label="Pending approvals" value={pending.data?.length || 0} icon="⏳" />
        <Metric label="Overdue decisions" value={overdue} hint="escalation required" icon="🚨" />
        <Metric label="Approved" value={approvedCount} icon="✅" />
        <Metric label="Rejected" value={rejectedCount} icon="❌" />
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Action Required Queue">
          <div className="list">
            {pending.data?.map((approval: any) => (
              <div className="list-item" key={approval.id}>
                <div>
                  <div className="row">
                    <strong>{approval.title}</strong>
                    {approval.is_overdue && <Badge label="Overdue" variant="danger" />}
                  </div>
                  <small className="muted">
                    Requested by {approval.requester_name} · Approver: {approval.approver_name}
                  </small>
                  <br />
                  <small>Due: {formatDate(approval.due_date)}</small>
                  {approval.notes && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                      {approval.notes}
                    </div>
                  )}
                </div>
                <div className="row">
                  <button
                    className="button small primary"
                    disabled={working === approval.id}
                    onClick={() => void handleApprove(approval.id)}
                  >
                    {working === approval.id ? "…" : "Approve"}
                  </button>
                  <button
                    className="button small danger"
                    disabled={working === approval.id}
                    onClick={() => setRejectTarget({ id: approval.id, title: approval.title })}
                  >
                    {working === approval.id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
            {!pending.data?.length && (
              <Empty title="All approvals clear">
                There are no open decisions awaiting stakeholder sign-off.
              </Empty>
            )}
          </div>
        </Card>

        <Card title="Decision History Log">
          <div className="list">
            {history.data?.map((approval: any) => (
              <div className="list-item" key={approval.id}>
                <div>
                  <strong>{approval.title}</strong>
                  <br />
                  <small className="muted">
                    Decided by {approval.decided_by_name || approval.approver_name} on {formatDate(approval.decided_at)}
                  </small>
                  {approval.rejection_reason && (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      <Badge label={approval.rejection_reason} variant="danger" />
                    </div>
                  )}
                  {approval.notes && (
                    <div style={{ marginTop: 2, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                      {approval.notes}
                    </div>
                  )}
                </div>
                <Status value={approval.status} />
              </div>
            ))}
            {!history.data?.length && (
              <Empty title="No historical records">
                Completed governance decisions will be catalogued here.
              </Empty>
            )}
          </div>
        </Card>
      </div>

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
              <option value="Missing information">Missing information</option>
              <option value="Needs revision">Needs revision</option>
              <option value="Incorrect submission">Incorrect submission</option>
              <option value="Budget issue">Budget issue</option>
              <option value="Timeline issue">Timeline issue</option>
              <option value="Quality concerns">Quality concerns</option>
              <option value="Scope mismatch">Scope mismatch</option>
              <option value="Other">Other</option>
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

export function BlockersPage({ projectId }: { projectId: number }) {
  const blockers = useRequest(() => api.blockers(projectId), [projectId]);

  if (blockers.loading) return <Loading text="Scanning for delivery blockers…" />;
  if (blockers.error) {
    return <ErrorNotice message={blockers.error} onRetry={() => void blockers.refresh()} />;
  }

  const list = blockers.data || [];

  return (
    <>
      <PageHeader
        title="Active Blocker Detection"
        description="Identify root causes delaying construction trades and direct corrective action to the accountable owner."
      />

      <div className="grid cards">
        <Metric label="Total blockers" value={list.length} icon="🚫" />
        <Metric
          label="Critical blockers"
          value={list.filter((b: any) => b.severity === "critical").length}
          hint="immediate escalation"
          icon="🔥"
        />
        <Metric
          label="Missing approvals"
          value={list.filter((b: any) => b.blocker_type === "missing_approval").length}
          icon="⏳"
        />
        <Metric
          label="Overdue task gates"
          value={list.filter((b: any) => b.blocker_type === "overdue_task").length}
          icon="📅"
        />
      </div>

      <Card title="Live Blocker Radar" style={{ marginTop: 16 }}>
        <div className="list">
          {list.map((blocker: any) => (
            <div className="list-item" key={`${blocker.blocker_type}-${blocker.id}`}>
              <div>
                <strong>{blocker.title}</strong>
                <br />
                <small className="muted">{blocker.reason}</small>
                <div style={{ marginTop: 4 }}>
                  <small>
                    Accountable owner: <strong>{blocker.owner_name || "Unassigned"}</strong> · Affected:{" "}
                    <strong>{blocker.affected_task_title || "Project wide"}</strong>
                  </small>
                </div>
              </div>
              <Status value={blocker.severity} />
            </div>
          ))}
          {!list.length && (
            <Empty title="No active blockers">
              No tasks, trades, or dependencies are currently blocked on this project.
            </Empty>
          )}
        </div>
      </Card>
    </>
  );
}

export function RisksPage({ projectId }: { projectId: number }) {
  const summary = useRequest(() => api.risks.summary(projectId), [projectId]);

  if (summary.loading) return <Loading text="Analyzing project risk exposure…" />;
  if (summary.error) {
    return <ErrorNotice message={summary.error} onRetry={() => void summary.refresh()} />;
  }

  const data = summary.data || {};
  const risksList = data.risks || [];

  return (
    <>
      <PageHeader
        title="Risk Intelligence Register"
        description="Prioritize project exposure by probability, severity score, category, and assigned mitigation owner."
      />

      <div className="grid cards">
        <Metric label="Tracked risks" value={data.total_risks || 0} icon="⚠️" />
        <Metric
          label="Critical exposure"
          value={data.by_severity?.critical || 0}
          hint="requires mitigation plan"
          icon="🔥"
        />
        <Metric
          label="Schedule risk level"
          value={data.schedule_risk?.severity || "Normal"}
          hint={`${data.schedule_risk?.overdue_tasks || 0} overdue tasks`}
        />
        <Metric
          label="Approval risk level"
          value={data.approval_risk?.severity || "Normal"}
          hint={`${data.approval_risk?.overdue_approvals || 0} overdue approvals`}
        />
      </div>

      <Card title="Project Risk Register" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Risk Title & Mitigation</th>
                <th>Category</th>
                <th>Probability</th>
                <th>Impact</th>
                <th>Score</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {risksList.map((risk: any) => (
                <tr key={risk.id}>
                  <td>
                    <strong>{risk.title}</strong>
                    <br />
                    <small className="muted">{risk.description || risk.mitigation || "Mitigation pending"}</small>
                  </td>
                  <td>
                    <Badge label={risk.category} variant="default" />
                  </td>
                  <td>{Math.round((risk.probability || 0) * 100)}%</td>
                  <td>{risk.impact_score}/10</td>
                  <td>
                    <strong>{risk.risk_score}</strong>
                  </td>
                  <td>
                    <Status value={risk.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!risksList.length && <Empty title="Zero recorded risks" />}
      </Card>
    </>
  );
}

export function ChangeRequestsPage({ projectId, user }: { projectId: number; user: any }) {
  const requests = useRequest(() => api.changes.list(projectId), [projectId]);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await api.changes.create({
        project_id: projectId,
        owner_id: user?.stakeholder_id || 1,
        title,
        description: description || reason,
        reason,
      });

      setTitle("");
      setDescription("");
      setReason("");
      setModalOpen(false);
      setMessage("Change request submitted for technical review.");
      await requests.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to submit change request");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.changes.status(id, status);
      await requests.refresh();
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Status update failed");
    }
  };

  if (requests.loading) return <Loading text="Loading change requests portfolio…" />;
  if (requests.error) {
    return <ErrorNotice message={requests.error} onRetry={() => void requests.refresh()} />;
  }

  const list = requests.data || [];

  return (
    <>
      <PageHeader
        title="Scope Change Management"
        description="Log architectural and MEP change requests, evaluate impact cascades, and track approvals through implementation."
        actions={
          <button className="button primary" onClick={() => setModalOpen(true)}>
            + New change request
          </button>
        }
      />

      {message && <div className="notice success" style={{ marginBottom: 16 }}>{message}</div>}

      <Card title="Change Portfolio">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Request Title</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Schedule Delta</th>
                <th>Impact Summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((req: any) => (
                <tr key={req.id}>
                  <td>
                    <strong>{req.title}</strong>
                    <br />
                    <small className="muted">{formatDate(req.created_at)}</small>
                  </td>
                  <td>
                    <Status value={req.status} />
                  </td>
                  <td>
                    <Status value={req.risk_level} />
                  </td>
                  <td>
                    <strong>{req.estimated_delay_days ?? 0} days</strong>
                  </td>
                  <td style={{ maxWidth: 320 }}>{req.impact_summary || "Assessment pending"}</td>
                  <td>
                    {req.status === "under_review" || req.status === "proposed" ? (
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className="button small primary"
                          onClick={() => void updateStatus(req.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="button small ghost"
                          onClick={() => void updateStatus(req.id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <small className="muted">—</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty title="No change requests">
            No scope or architectural adjustments have been submitted for this project.
          </Empty>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Architectural Change Request"
      >
        <form className="stack" onSubmit={create}>
          <div className="field">
            <label>Title</label>
            <input
              className="input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Relocate kitchen island 1.2m towards window"
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of physical changes, materials, or dimensions…"
            />
          </div>
          <div className="field">
            <label>Reason & Driver</label>
            <input
              className="input"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client aesthetic upgrade after 3D VR review"
            />
          </div>
          <div className="row between" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="button ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button className="button primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for Impact Analysis"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function CommunicationsPage({ projectId }: { projectId: number }) {
  const conversations = useRequest(() => api.conversations.list(projectId), [projectId]);
  const [source, setSource] = useState("whatsapp");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const sampleConversations: Record<string, { title: string; content: string }> = {
    whatsapp: {
      title: "WhatsApp: Urgent HVAC & Ceiling Clash in Salon",
      content:
        "[10:30] Deepak Singh (Contractor): Team, we hit an obstacle in the Grand Salon ceiling.\n[10:32] Priya Nair (MEP): What is the issue Deepak?\n[10:35] Deepak Singh: The HVAC duct drops 250mm below slab, which clashes with the linear LED slot Ananya drew.\n[10:38] Ananya Sharma (Architect): We cannot drop the ceiling any further. Can we re-route the duct through the pantry bulkhead?\n[10:41] Priya Nair: Yes, confirmed. I will issue a revised duct shop drawing by tomorrow 2pm.\n[10:44] Arjun Reddy (PM): Decision approved: Re-route duct through pantry bulkhead. Action item: Priya to issue drawing by tomorrow 2pm.",
    },
    meeting_notes: {
      title: "Site Coordination Meeting #07: Marble Arrival & Waterproofing",
      content:
        "Date: 2026-09-12\nAttendees: Arjun Reddy, Ananya Sharma, Deepak Singh, Sanjay Kapoor\n1. Sanjay confirmed Calacatta Gold slabs are unloaded at Gurgaon warehouse.\n2. Decision: Ananya to visit warehouse on Thursday 11:00 for dry-lay sign-off.\n3. Risk: Powder room waterproofing test showed minor pressure weep. Deepak to re-apply 3rd coat of polyurethane membrane.\n4. Action: Deepak to complete re-test before Friday.",
    },
  };

  const loadSample = (type: string) => {
    setSource(type);
    if (sampleConversations[type]) {
      setTitle(sampleConversations[type].title);
      setContent(sampleConversations[type].content);
    }
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setExtracted(null);

    try {
      const res = await api.conversations.upload({
        project_id: projectId,
        source_type: source,
        title,
        content,
      });

      setExtracted(res.extraction);
      setTitle("");
      setContent("");
      setNotice("Communication ingested and AI structured intelligence extracted.");
      await conversations.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Communications Intelligence"
        description="Ingest unstructured WhatsApp transcripts, meeting minutes, and emails to extract actionable tasks, risks, and decisions."
      />

      <div className="grid two">
        <Card title="Ingest Communication Stream">
          <div className="chips" style={{ marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>
              Quick sample:
            </span>
            <button
              type="button"
              className="chip"
              onClick={() => loadSample("whatsapp")}
            >
              WhatsApp HVAC Clash
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => loadSample("meeting_notes")}
            >
              Meeting Minutes #07
            </button>
          </div>

          <form className="stack" onSubmit={upload}>
            <div className="field">
              <label>Source Type</label>
              <select
                className="select"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="whatsapp">WhatsApp Group Chat</option>
                <option value="meeting_notes">Meeting Notes / Minutes</option>
                <option value="email">Email Thread</option>
                <option value="transcript">Audio / Video Call Transcript</option>
              </select>
            </div>

            <div className="field">
              <label>Subject / Title</label>
              <input
                className="input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. WhatsApp: Kitchen MEP Discussion"
              />
            </div>

            <div className="field">
              <label>Conversation Content</label>
              <textarea
                className="textarea"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste conversation text, email chain, or transcript here…"
                style={{ minHeight: 140 }}
              />
            </div>

            {notice && <div className="notice success">{notice}</div>}

            <button className="button primary" disabled={busy}>
              {busy ? "Parsing with AI Engine…" : "Extract Intelligence"}
            </button>
          </form>
        </Card>

        <Card title="Extracted Structured Intelligence">
          {!extracted ? (
            <Empty title="Awaiting ingestion">
              Paste conversation text to automatically parse tasks, decisions, risks, and deadline commitments.
            </Empty>
          ) : (
            <div className="stack">
              {extracted.summary && (
                <div className="notice">
                  <strong>AI Summary:</strong> {extracted.summary}
                </div>
              )}

              {extracted.tasks?.length > 0 && (
                <div>
                  <strong>Extracted Tasks ({extracted.tasks.length})</strong>
                  <div className="list" style={{ marginTop: 6 }}>
                    {extracted.tasks.map((t: any, i: number) => (
                      <div className="list-item" key={i}>
                        <span>{t.title}</span>
                        <Badge label={t.priority || "high"} variant="warn" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extracted.decisions?.length > 0 && (
                <div>
                  <strong>Extracted Decisions ({extracted.decisions.length})</strong>
                  <div className="list" style={{ marginTop: 6 }}>
                    {extracted.decisions.map((d: any, i: number) => (
                      <div className="list-item" key={i}>
                        <div>
                          <strong>{d.title}</strong>
                          <br />
                          <small className="muted">{d.rationale}</small>
                        </div>
                        <Badge label="Decision" variant="blue" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extracted.risks?.length > 0 && (
                <div>
                  <strong>Extracted Risks ({extracted.risks.length})</strong>
                  <div className="list" style={{ marginTop: 6 }}>
                    {extracted.risks.map((r: any, i: number) => (
                      <div className="list-item" key={i}>
                        <span>{r.title}</span>
                        <Status value={r.severity || "high"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card title="Communication Archive" style={{ marginTop: 16 }}>
        {conversations.loading ? (
          <Loading text="Loading communication logs…" />
        ) : conversations.error ? (
          <ErrorNotice message={conversations.error} />
        ) : (
          <div className="list">
            {conversations.data?.map((c: any) => (
              <div className="list-item" key={c.id}>
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{c.title}</strong>
                    <Badge label={c.source_type} variant="default" />
                  </div>
                  <small className="muted">{formatDate(c.created_at)}</small>
                  {c.summary && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{c.summary}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge brand">{(c.extracted_tasks || []).length} tasks extracted</span>
                </div>
              </div>
            ))}
            {!conversations.data?.length && <Empty title="No communications recorded yet" />}
          </div>
        )}
      </Card>
    </>
  );
}

export function GraphPage({ projectId }: { projectId: number }) {
  const graph = useRequest(() => api.graph(projectId), [projectId]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  if (graph.loading) return <Loading text="Constructing project knowledge graph…" />;
  if (graph.error) {
    return <ErrorNotice message={graph.error} onRetry={() => void graph.refresh()} />;
  }

  const data = graph.data || { nodes: [], edges: [] };
  const allNodes = data.nodes || [];
  const filteredNodes = allNodes.filter((node: any) => {
    const matchesType = filter === "all" || node.type === filter;
    const matchesSearch = !search || node.label.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <>
      <PageHeader
        title="Project Knowledge Graph"
        description="Explore the connected network of tasks, trade contractors, material vendors, and governance sign-offs."
      />

      <div className="grid cards">
        <Metric label="Graph nodes" value={allNodes.length} icon="⌁" />
        <Metric label="Active relationships" value={(data.edges || []).length} icon="⇄" />
        <Metric
          label="Tasks mapped"
          value={allNodes.filter((n: any) => n.type === "task").length}
          icon="📋"
        />
        <Metric
          label="Stakeholders & Vendors"
          value={allNodes.filter((n: any) => n.type === "stakeholder" || n.type === "vendor").length}
          icon="👥"
        />
      </div>

      <Card title="Interactive Entity Network" style={{ marginTop: 16 }}>
        <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap" }}>
          <div className="graph-filters">
            {["all", "task", "stakeholder", "vendor", "change_request"].map((category) => (
              <button
                key={category}
                type="button"
                className={`button small ${filter === category ? "primary" : "ghost"}`}
                onClick={() => setFilter(category)}
              >
                {category.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter entities by name…"
          />
        </div>

        <div className="graph">
          {filteredNodes.slice(0, 36).map((node: any) => (
            <div className="graph-node" key={node.id}>
              <div className="row between">
                <Badge label={node.type} variant="brand" />
                {node.status && <Status value={node.status} />}
              </div>
              <p>{node.label}</p>
              {node.role && <small className="muted">Role: {node.role}</small>}
              {node.metadata?.delay !== undefined && (
                <small className="muted">Delay: +{node.metadata.delay}d</small>
              )}
            </div>
          ))}
          {!filteredNodes.length && <Empty title="No entities match filter" />}
        </div>
      </Card>

      <Card title="Structural Relationships Log" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Source Entity</th>
                <th>Relationship</th>
                <th>Target Entity</th>
              </tr>
            </thead>
            <tbody>
              {(data.edges || []).slice(0, 25).map((edge: any) => (
                <tr key={edge.id}>
                  <td>
                    <strong>{edge.source}</strong>
                  </td>
                  <td>
                    <Badge label={edge.label || edge.relationship_type} variant="blue" />
                  </td>
                  <td>
                    <strong>{edge.target}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function MemoryPage({ projectId }: { projectId: number }) {
  const [query, setQuery] = useState("Why is the kitchen redesign delayed?");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sampleQueries = [
    "Why is the kitchen redesign delayed?",
    "What decisions were made about Calacatta marble?",
    "Who approved the Lutron Palladiom keypads?",
    "What is the contractor pausing right now?",
  ];

  const search = async (q?: string) => {
    const text = (q || query).trim();
    if (!text) return;
    if (q) setQuery(q);

    setBusy(true);
    setError("");

    try {
      const data = await api.memory({ project_id: projectId, query: text });
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Memory search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Project Memory & Decision Archives"
        description="Query institutional records, past meeting discussions, signed change orders, and historical trade commitments."
      />

      <div className="chips">
        {sampleQueries.map((item, idx) => (
          <button key={idx} className="chip" onClick={() => void search(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <Card title="Query Project Memory">
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <div className="field">
              <label>Search Query</label>
              <textarea
                className="textarea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about historical decisions, approvals, delays, or vendor actions…"
              />
            </div>

            {error && <ErrorNotice message={error} />}

            <button className="button primary" disabled={busy}>
              {busy ? "Querying Memory Bank…" : "Search Project Memory"}
            </button>
          </form>
        </Card>

        <Card title="Grounded Retrieval Answer">
          {result ? (
            <div className="stack">
              <div
                className="notice"
                style={{ whiteSpace: "pre-wrap", background: "#0c2035", borderColor: "var(--brand)" }}
              >
                {result.answer}
              </div>

              {result.citations?.length > 0 && (
                <div>
                  <strong>Corroborating Citations & Records</strong>
                  <div className="list" style={{ marginTop: 8 }}>
                    {result.citations.map((c: any, index: number) => (
                      <div className="list-item" key={index}>
                        <div>
                          <strong>{c.reference}</strong>
                          <br />
                          <small className="muted">{c.detail}</small>
                        </div>
                        <Badge label="Verified" variant="brand" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Empty title="No query executed">
              Enter a question or click one of the suggested query chips above to interrogate the project memory bank.
            </Empty>
          )}
        </Card>
      </div>
    </>
  );
}

export function SimulatorPage({ projectId }: { projectId: number }) {
  const [scenario, setScenario] = useState("Vendor marble shipment delayed by 7 days");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const presetScenarios = [
    "Vendor marble shipment delayed by 7 days",
    "Lead architect drawing sign-off postponed by 4 days",
    "General contractor labor workforce reduced by 30% during festival",
    "Client requests heated marble floor upgrade in living salon",
  ];

  const simulate = async (text?: string) => {
    const sc = (text || scenario).trim();
    if (!sc) return;
    if (text) setScenario(text);

    setBusy(true);
    try {
      const res = await api.ai.simulate({ project_id: projectId, scenario: sc });
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="What-If Disruption Simulator"
        description="Simulate potential delivery disruptions and assess cascading delays before committing to trade rescheduling."
      />

      <div className="chips">
        {presetScenarios.map((item, idx) => (
          <button key={idx} className="chip" onClick={() => void simulate(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <Card title="Define Disruption Hypothesis">
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void simulate();
            }}
          >
            <div className="field">
              <label>Hypothetical Scenario</label>
              <textarea
                className="textarea"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe a potential delay, trade absence, or material shortfall…"
              />
            </div>

            <button className="button primary" disabled={busy}>
              {busy ? "Running Monte Carlo Simulation…" : "Simulate Outcomes"}
            </button>
          </form>
        </Card>

        <Card title="Projected Delivery Impact">
          {result ? (
            <div className="stack">
              <div className="grid three">
                <Metric label="Schedule Delay" value={`+${result.estimated_delay_days}d`} />
                <Metric label="Risk Score" value={`${result.risk_score}/10`} />
                <Metric
                  label="Success Probability"
                  value={
                    result.probability_of_success
                      ? `${Math.round(result.probability_of_success * 100)}%`
                      : "68%"
                  }
                />
              </div>

              <div>
                <strong>Recommended Mitigations</strong>
                <div className="list" style={{ marginTop: 8 }}>
                  {(result.recommendations || []).map((item: string, idx: number) => (
                    <div className="list-item" key={idx}>
                      <span>{item}</span>
                      <Badge label={`Priority ${idx + 1}`} variant="warn" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Empty title="Awaiting simulation">
              Select or type a disruption scenario to project schedule exposure and mitigation steps.
            </Empty>
          )}
        </Card>
      </div>

      {result?.affected_tasks?.length > 0 && (
        <Card title="Impacted Delivery Chain" style={{ marginTop: 16 }}>
          <div className="list">
            {result.affected_tasks.map((task: any, index: number) => (
              <div className="list-item" key={index}>
                <div>
                  <strong>{task.title}</strong>
                  <br />
                  <small className="muted">{task.impact_description}</small>
                </div>
                <Badge label={task.new_deadline_estimate || "Adjusted"} variant="danger" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export function SummariesPage({ projectId }: { projectId: number }) {
  const [type, setType] = useState("executive");
  const [summary, setSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const data = await api.ai.summarize({ project_id: projectId, summary_type: type });
      setSummary(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="AI Executive Briefings"
        description="Generate concise, multi-disciplinary progress reports for ownership, general contractors, and trade leads."
        actions={
          <div className="row">
            <select
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="executive">Executive Summary</option>
              <option value="project">Project Status</option>
              <option value="weekly">Weekly Coordination</option>
              <option value="daily">Daily Site Brief</option>
            </select>
            <button className="button primary" onClick={() => void create()} disabled={busy}>
              {busy ? "Generating…" : "Generate Briefing"}
            </button>
          </div>
        }
      />

      <Card title={`${type.charAt(0).toUpperCase() + type.slice(1)} Intelligence Briefing`}>
        {summary ? (
          <div className="stack">
            <div className="notice" style={{ whiteSpace: "pre-wrap", background: "#0c1f34" }}>
              {summary.summary}
            </div>

            <div className="grid two" style={{ marginTop: 8 }}>
              <div>
                <strong>Key Critical Points</strong>
                <div className="list" style={{ marginTop: 8 }}>
                  {(summary.key_points || []).map((item: string, index: number) => (
                    <div className="list-item" key={index}>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong>Recommended Next Actions</strong>
                <div className="list" style={{ marginTop: 8 }}>
                  {(summary.recommendations || []).map((item: string, index: number) => (
                    <div className="list-item" key={index}>
                      <span>{item}</span>
                      <span style={{ color: "var(--brand)" }}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Empty title="No briefing generated yet">
            Choose a briefing category above and click <strong>Generate Briefing</strong> to synthesize live project data into an executive report.
          </Empty>
        )}
      </Card>
    </>
  );
}

export function AlertsPage({ projectId }: { projectId: number }) {
  const notifications = useRequest(() => api.notifications.list(projectId), [projectId]);

  const read = async (id: number) => {
    await api.notifications.read(id);
    await notifications.refresh();
  };

  if (notifications.loading) return <Loading text="Loading coordination alerts…" />;
  if (notifications.error) {
    return <ErrorNotice message={notifications.error} onRetry={() => void notifications.refresh()} />;
  }

  const list = notifications.data || [];

  return (
    <>
      <PageHeader
        title="Coordination Alerts Feed"
        description="Real-time notifications triggered by change cascades, overdue approvals, and delivery risks."
      />

      <Card title="Project Notification Stream">
        <div className="list">
          {list.map((n: any) => (
            <div className="list-item" key={n.id}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <strong>{n.title}</strong>
                  {!n.is_read && <Badge label="New" variant="brand" />}
                </div>
                <small className="muted">{n.message}</small>
                <div style={{ marginTop: 4 }}>
                  <small>{formatDate(n.created_at)}</small>
                </div>
              </div>
              <div className="row">
                <Status value={n.notification_type} />
                {!n.is_read && (
                  <button className="button small ghost" onClick={() => void read(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
          {!list.length && <Empty title="Zero unread coordination alerts" />}
        </div>
      </Card>
    </>
  );
}

export function UserPage({ user }: { user: any }) {
  const [name, setName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [mobile, setMobile] = useState(user?.mobile_no || "");
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    try {
      await api.auth.update({ full_name: name, username, mobile_no: mobile });
      setMessage("Profile saved successfully.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const password = async (event: FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);
    setMessage("");
    try {
      await api.auth.password({ current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setMessage("Password changed successfully.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    localStorage.removeItem("archscale_token");
    localStorage.removeItem("archscale_refresh_token");
    window.location.assign("/login");
  };

  if (!user) {
    return (
      <>
        <PageHeader
          title="Account Management"
          description="Sign in to customize your profile, view role permissions, and manage credentials."
        />
        <Card>
          <Empty title="Sign in required">
            <a className="button primary" href="/login">
              Sign in to ArchScale
            </a>
          </Empty>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Account"
        description="Manage your profile identity, security credentials, and organization affiliation."
        actions={
          <button className="button danger" onClick={() => void logout()}>
            Sign out
          </button>
        }
      />

      {message && <div className="notice success" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="grid two">
        <Card title="Profile Information">
          <form className="stack" onSubmit={save}>
            <div className="field">
              <label>Full Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Mobile Number</label>
              <input
                className="input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div className="notice">
              Email: <strong>{user.email}</strong>
              <br />
              Role: <Status value={user.role} />
              {user.organization_name && (
                <>
                  <br />
                  Organization: <strong>{user.organization_name}</strong>
                </>
              )}
            </div>
            <button className="button primary" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </Card>

        <Card title="Update Password">
          <form className="stack" onSubmit={password}>
            <div className="field">
              <label>Current Password</label>
              <input
                className="input"
                type="password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="field">
              <label>New Password (min 6 chars)</label>
              <input
                className="input"
                type="password"
                minLength={6}
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <button className="button primary" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update Password"}
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}

export { AdminPage } from "@/components/admin-pages";
