"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Metric,
  PageHeader,
  Status,
  useRequest,
  Badge,
} from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMIN OPERATIONS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export function AdminOperationsDashboard({ user }: { user: any }) {
  const operations = useRequest(() => api.dashboard.operations(), []);

  if (operations.loading) {
    return <Loading text="Aggregating cross-project studio operations telemetry…" />;
  }

  if (operations.error) {
    return (
      <ErrorNotice
        message={operations.error}
        onRetry={() => void operations.refresh()}
      />
    );
  }

  const data = operations.data || {};
  const projects = data.projects_summary || [];
  const team = data.team_performance || [];
  const clients = data.clients_status || [];
  const risks = data.risk_indicators || [];
  const tasks = data.tasks_overview || {};

  return (
    <>
      <PageHeader
        title={`Operations Command Centre · ${user?.full_name || "Administrator"}`}
        description="Cross-project studio delivery posture, team productivity, workload allocation, and portfolio risk."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost" onClick={() => void operations.refresh()}>
              Refresh telemetry
            </button>
            <Link className="button primary" href="/admin">
              Admin Suite
            </Link>
          </div>
        }
      />

      {/* Security Privacy Notice */}
      <div className="notice info" style={{ marginBottom: 18 }}>
        <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <strong>Operations Governance Active</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              As Administrator, your workspace provides macro operational oversight across teams, project delivery velocities, and studio risks. Individual client confidential drawings, contracts, and private files remain isolated to client accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 Operational Metrics */}
      <div className="grid cards">
        <Metric
          label="Total Studio Projects"
          value={data.total_projects ?? 0}
          hint={`${data.active_projects ?? 0} active in production`}
          icon="🏢"
        />
        <Metric
          label="Team Productivity"
          value={`${tasks.completion_rate ?? 85}%`}
          hint={`${tasks.completed ?? 0} of ${tasks.total ?? 0} tasks delivered`}
          icon="📈"
        />
        <Metric
          label="Delayed Projects"
          value={data.delayed_projects ?? 0}
          hint={data.delayed_projects ? "Requires resource reallocation" : "Zero schedule slips"}
          icon="⏱️"
        />
        <Metric
          label="Portfolio Risk Exposure"
          value={risks.length}
          hint={`${risks.filter((r: any) => r.severity === "critical").length} critical mitigations active`}
          icon="⚠️"
        />
      </div>

      {/* Section 1: Projects Portfolio & Standardized Progress Engine */}
      <div style={{ marginTop: 24 }}>
        <Card title="Projects Delivery & Standardized Progress Engine">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Standardized Progress</th>
                  <th>Phase Breakdown</th>
                  <th>Target Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <br />
                      <small className="muted">ID: #{p.id} · Budget: ₹{(p.budget || 0).toLocaleString()}</small>
                    </td>
                    <td>
                      <Status value={p.status_label || p.status} />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <span style={{ fontWeight: 700 }}>{p.health_score}/100</span>
                        <Badge label={p.health_status} variant={p.health_score > 70 ? "brand" : "warn"} />
                      </div>
                    </td>
                    <td style={{ minWidth: 200 }}>
                      <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: "var(--brand)" }}>Completed: {p.overall_completion_pct}%</span>
                        <span className="muted">Remaining: {p.remaining_pct}%</span>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${p.overall_completion_pct}%` }} />
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                        <span className="badge small">Plan: {p.planning_completion_pct}%</span>
                        <span className="badge small">Design: {p.design_completion_pct}%</span>
                        <span className="badge small">Exec: {p.execution_completion_pct}%</span>
                        <span className="badge small">Doc: {p.documentation_completion_pct}%</span>
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>
                      {p.target_end_date ? new Date(p.target_end_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Section 2: Team Performance & Workload Distribution */}
      <div className="grid two" style={{ marginTop: 20 }}>
        <Card title="Team Productivity & Workload Allocation">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Contributor</th>
                  <th>Role</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Productivity</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.name}</strong>
                      <br />
                      <small className="muted">{m.title || m.email}</small>
                    </td>
                    <td>
                      <Status value={m.role} />
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{m.assigned_tasks}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "var(--brand)" }}>{m.completed_tasks}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <div className="progress" style={{ width: 60 }}>
                          <span style={{ width: `${m.productivity_score}%` }} />
                        </div>
                        <small style={{ fontWeight: 600 }}>{m.productivity_score}%</small>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Client Portfolio Overview */}
        <Card title="Client Portfolio Status">
          <div className="list">
            {clients.map((c: any) => (
              <div className="list-item" key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <br />
                  <small className="muted">{c.title || c.email} · {c.primary_project}</small>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.completion_pct}% complete</span>
                  <Status value={c.project_status} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="row between">
              <div>
                <strong style={{ fontSize: 13 }}>Quick Administrative Actions</strong>
                <p style={{ fontSize: 12, margin: "2px 0 0", color: "var(--muted)" }}>
                  Manage platform users, verify audit logs, or inspect system services.
                </p>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link className="button small ghost" href="/admin/users">
                  Manage Users
                </Link>
                <Link className="button small ghost" href="/admin/audit-logs">
                  Audit Logs
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 3: Risk Indicators */}
      <div style={{ marginTop: 20 }}>
        <Card title="Active Portfolio Risk Indicators">
          <div className="grid two">
            {risks.map((r: any) => (
              <div
                key={r.id}
                style={{
                  padding: 14,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--line)",
                  background: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <div className="row between" style={{ marginBottom: 6 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge label={r.severity.toUpperCase()} variant={r.severity === "critical" ? "danger" : "warn"} />
                    <strong style={{ fontSize: 14 }}>{r.title}</strong>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)" }}>
                    Score: {r.score}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>
                  <strong>Mitigation:</strong> {r.mitigation}
                </p>
                <div className="row between" style={{ fontSize: 12, marginTop: 8 }}>
                  <span className="badge small">{r.category}</span>
                  <Status value={r.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. CLIENT EXECUTIVE DASHBOARD (CLIENT ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export function ClientDashboard({ projectId, user }: { projectId: number; user: any }) {
  const [activeTab, setActiveTab] = useState<"overview" | "drawings" | "financials" | "timeline" | "contacts">("overview");
  const dashboard = useRequest(() => api.dashboard(projectId), [projectId]);

  if (dashboard.loading) {
    return <Loading text="Loading your confidential executive project command center…" />;
  }

  if (dashboard.error) {
    return (
      <>
        <PageHeader
          title="Access Restricted"
          description="Confidential project details are restricted to authorized clients."
        />
        <Card>
          <div className="notice error" style={{ marginBottom: 16 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛑</span>
              <div>
                <strong>403 Forbidden: Confidential Client View</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {dashboard.error}
                </p>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <Link className="button ghost" href="/">
              Return to Workspace
            </Link>
            <Link className="button primary" href="/login">
              Sign In as Client
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const data = dashboard.data || {};
  const project = data.project || {};
  const progress = data.progress || {};
  const budget = data.budget_breakdown || {};
  const milestones = data.milestones || [];
  const documents = data.documents || [];
  const contacts = data.team_contacts || [];
  const decisions = data.recent_decisions || [];

  return (
    <>
      <PageHeader
        title={`Executive Command · ${user?.full_name || "Client Portal"}`}
        description={`${project.name || "Luxury Residence"} · ${project.location || "Gurgaon, NCR"}`}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost" onClick={() => void dashboard.refresh()}>
              Refresh Live Data
            </button>
            <Link className="button primary" href="/chat">
              Ask AI Project Manager
            </Link>
          </div>
        }
      />

      {/* Standardized Project Progress Engine Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(61, 217, 178, 0.08) 0%, rgba(77, 158, 255, 0.06) 100%)",
          border: "1px solid rgba(61, 217, 178, 0.25)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div className="row between" style={{ marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 20, color: "var(--text-bright)" }}>
                Project Progress Engine
              </h2>
              <Status value={progress.status_label || "In Progress"} />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Standardized multi-phase delivery tracking across architectural design, municipal compliance, and field execution.
            </p>
          </div>
          <div className="row" style={{ gap: 16, alignItems: "baseline" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--brand)" }}>
                {progress.display_completed || "Completed: 68%"}
              </div>
              <small style={{ color: "var(--muted)", fontWeight: 600 }}>
                {progress.display_remaining || "Remaining: 32%"}
              </small>
            </div>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="progress" style={{ height: 10, background: "rgba(255,255,255,0.08)" }}>
          <span style={{ width: `${progress.overall_completion_pct || 68}%` }} />
        </div>

        {/* 4 Standardized Phases */}
        <div className="grid four" style={{ marginTop: 16 }}>
          {(progress.phases || [
            { phase: "Planning", completion_pct: 85, status: "Completed" },
            { phase: "Design", completion_pct: 92, status: "Completed" },
            { phase: "Execution", completion_pct: 54, status: "In Progress" },
            { phase: "Documentation", completion_pct: 70, status: "In Progress" },
          ]).map((ph: any) => (
            <div key={ph.phase} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: "var(--radius)" }}>
              <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}>
                <strong>{ph.phase} Phase</strong>
                <span style={{ fontWeight: 700, color: ph.completion_pct >= 80 ? "var(--brand)" : "var(--warn)" }}>
                  {ph.completion_pct}%
                </span>
              </div>
              <div className="progress" style={{ height: 6 }}>
                <span style={{ width: `${ph.completion_pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 4 Client Metrics */}
      <div className="grid cards">
        <Metric
          label="Project Health Posture"
          value={`${project.health_score || 62}/100`}
          hint={`${project.health_status || "At Risk"} coordination posture`}
          icon="🛡️"
        />
        <Metric
          label="Budget Committed"
          value={budget.formatted_spent || "₹76.5 L"}
          hint={`of ${budget.formatted_total || "₹1.25 Cr"} total project budget`}
          icon="💰"
        />
        <Metric
          label="Key Milestones Tracked"
          value={milestones.length}
          hint={`${milestones.filter((m: any) => m.status === "completed").length} verified complete`}
          icon="🏁"
        />
        <Metric
          label="Architectural Documents"
          value={documents.length}
          hint="Master plans & joinery specs available"
          icon="📐"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="row" style={{ gap: 8, margin: "24px 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
        {[
          ["overview", "⌘ Overview & Decisions"],
          ["drawings", "📐 Architectural Drawings & Specs"],
          ["financials", "💰 Budget & Financials"],
          ["timeline", "🏁 Delivery Milestones"],
          ["contacts", "👥 Studio Team Contacts"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`button small ${activeTab === key ? "primary" : "ghost"}`}
            onClick={() => setActiveTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="grid two">
          <Card title="Recent Decisions & Project Log">
            <div className="list">
              {decisions.map((d: any) => (
                <div className="list-item" key={d.id}>
                  <div>
                    <strong>{d.title}</strong>
                    <br />
                    <small className="muted">{d.rationale}</small>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <span className="badge small">{d.decided_by || "Principal Architect"}</span>
                    <br />
                    <small className="muted">{d.decided_at ? new Date(d.decided_at).toLocaleDateString() : "Recent"}</small>
                  </div>
                </div>
              ))}
              {!decisions.length && <Empty title="No decisions logged" />}
            </div>
          </Card>

          <Card title="Pending Client Approvals & Sign-Offs">
            <div className="list">
              {(data.pending_approvals || []).map((appr: any) => (
                <div className="list-item" key={appr.id}>
                  <div>
                    <strong>{appr.title}</strong>
                    <br />
                    <small className="muted">Impact: {appr.description || "Requires client sign-off"}</small>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Link className="button small primary" href="/approvals">
                      Review & Approve
                    </Link>
                  </div>
                </div>
              ))}
              {!(data.pending_approvals || []).length && (
                <Empty title="All client sign-offs up to date">
                  No pending approvals awaiting your review.
                </Empty>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Drawings & Documents */}
      {activeTab === "drawings" && (
        <Card title="Confidential Architectural Drawings & Millwork Specifications">
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Verified CAD drawings, MEP schematics, and bespoke joinery fabrication schedules for {project.name}.
          </p>
          <div className="grid two">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--line)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="badge brand">{doc.document_type}</span>
                  <small className="muted">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Current Rev"}
                  </small>
                </div>
                <strong style={{ fontSize: 15, color: "var(--text-bright)" }}>
                  {doc.title}
                </strong>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0" }}>
                  {doc.extracted_data || doc.content}
                </p>
                <div className="row between" style={{ marginTop: 12 }}>
                  <a
                    href={doc.file_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="button small ghost"
                    style={{ gap: 6 }}
                  >
                    <span>📥</span> Download Package
                  </a>
                  <span className="badge small" style={{ background: "rgba(61, 217, 178, 0.1)", color: "var(--brand)" }}>
                    Verified File
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB CONTENT: Financials & Budget */}
      {activeTab === "financials" && (
        <div className="grid two">
          <Card title="Financial Summary & Budget Allocation">
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr>
                    <td><strong>Total Approved Budget</strong></td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontSize: 16 }}>
                      {budget.formatted_total}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Spent to Date</strong></td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--brand)", fontSize: 16 }}>
                      {budget.formatted_spent}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Committed Contracts (Milestone Retainage)</strong></td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ₹{(budget.committed || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Remaining Project Contingency</strong></td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-bright)", fontSize: 16 }}>
                      {budget.formatted_remaining}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Expenditure Trajectory">
            <div className="row between" style={{ marginBottom: 12 }}>
              <span>Capital Outlay</span>
              <strong>{progress.overall_completion_pct || 68}% of budget utilized</strong>
            </div>
            <div className="progress" style={{ height: 12 }}>
              <span style={{ width: `${progress.overall_completion_pct || 68}%` }} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              Funds are released against certified milestone inspections approved by the Lead Architect and Client sign-off gates.
            </p>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Timeline */}
      {activeTab === "timeline" && (
        <Card title="Project Milestones & Critical Deadlines">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Milestone Deliverable</th>
                  <th>Responsible Lead</th>
                  <th>Progress</th>
                  <th>Target Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m: any) => (
                  <tr key={m.id}>
                    <td><strong>{m.title}</strong></td>
                    <td className="muted">{m.assignee}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <div className="progress" style={{ width: 80 }}>
                          <span style={{ width: `${m.progress}%` }} />
                        </div>
                        <small>{m.progress}%</small>
                      </div>
                    </td>
                    <td className="muted">
                      {m.due_date ? new Date(m.due_date).toLocaleDateString() : "TBD"}
                    </td>
                    <td>
                      <Status value={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: Contacts */}
      {activeTab === "contacts" && (
        <Card title="Studio Delivery Leadership Contacts">
          <div className="grid two">
            {contacts.map((c: any) => (
              <div
                key={c.id}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--line)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="row between" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: 15 }}>{c.name}</strong>
                  <Badge label={c.role} variant="brand" />
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{c.title}</div>
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div>📞 {c.phone || "+91-98765-43210"}</div>
                  <div>✉️ {c.email}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. MANAGEMENT TEAM DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export function ManagementDashboard({ user }: { user: any }) {
  const management = useRequest(() => api.dashboard.management(), []);

  if (management.loading) {
    return <Loading text="Fetching your management task deliverables…" />;
  }

  if (management.error) {
    return <ErrorNotice message={management.error} onRetry={() => void management.refresh()} />;
  }

  const data = management.data || {};
  const tasks = data.assigned_tasks || [];
  const counts = data.task_counts || {};
  const isReadOnly = data.user?.is_read_only || user?.role === "viewer";
  const projects = data.projects_progress || [];

  return (
    <>
      <PageHeader
        title={`Management Workspace · ${user?.full_name || "Team Contributor"}`}
        description={`Active coordination for ${user?.role || "team member"} across assigned tasks and project phases.`}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost" onClick={() => void management.refresh()}>
              Refresh tasks
            </button>
            <Link className="button primary" href="/tasks">
              Task Matrix
            </Link>
          </div>
        }
      />

      {/* Viewer Read-Only Banner */}
      {isReadOnly && (
        <div className="notice warn" style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 20 }}>👁️</span>
            <div>
              <strong>Read-Only Inspection Mode</strong>
              <p style={{ margin: "2px 0 0", fontSize: 13 }}>
                You are logged in with Viewer credentials. You can inspect project milestones, progress metrics, and team activity, but task modifications and confidential client drawings are restricted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 4 Metrics */}
      <div className="grid cards">
        <Metric
          label="Tasks Assigned to Me"
          value={counts.total_assigned ?? tasks.length}
          hint="Deliverables on your desk"
          icon="📋"
        />
        <Metric
          label="In Progress"
          value={counts.in_progress ?? 0}
          hint="Active workstreams"
          icon="⚡"
        />
        <Metric
          label="Completed"
          value={counts.completed ?? 0}
          hint="Delivered milestones"
          icon="✓"
        />
        <Metric
          label="Pending Approvals"
          value={data.pending_approvals_count ?? 0}
          hint="Waiting sign-offs"
          icon="⏳"
        />
      </div>

      {/* My Active Tasks */}
      <div style={{ marginTop: 24 }}>
        <Card title="My Assigned Deliverables & Work">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      <br />
                      <small className="muted">{t.description || "Assigned task"}</small>
                    </td>
                    <td>
                      <Badge label={t.priority} variant={t.priority === "critical" ? "danger" : "default"} />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="row" style={{ gap: 6, alignItems: "center" }}>
                        <div className="progress" style={{ width: 60 }}>
                          <span style={{ width: `${t.progress}%` }} />
                        </div>
                        <small>{t.progress}%</small>
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <Status value={t.status} />
                    </td>
                    <td>
                      {!isReadOnly ? (
                        <button
                          className="button small ghost"
                          onClick={() => alert(`Updating task: ${t.title}`)}
                        >
                          Update Status
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!tasks.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                      No active tasks currently assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Assigned Projects Progress Engine */}
      <div style={{ marginTop: 20 }}>
        <Card title="Project Delivery Progress">
          {projects.map((p: any) => (
            <div key={p.id} style={{ marginBottom: 16 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <strong>{p.name}</strong>
                <span style={{ fontWeight: 700, color: "var(--brand)" }}>
                  Completed: {p.overall_completion_pct}%
                </span>
              </div>
              <div className="progress" style={{ height: 8 }}>
                <span style={{ width: `${p.overall_completion_pct}%` }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. VENDOR / PARTNER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export function VendorDashboard({ user }: { user: any }) {
  const vendor = useRequest(() => api.dashboard.vendor(), []);

  if (vendor.loading) {
    return <Loading text="Fetching partner deliverable packages…" />;
  }

  if (vendor.error) {
    return <ErrorNotice message={vendor.error} onRetry={() => void vendor.refresh()} />;
  }

  const data = vendor.data || {};
  const deliverables = data.assigned_deliverables || [];
  const summary = data.deliverables_summary || {};
  const proj = data.project_progress || {};

  return (
    <>
      <PageHeader
        title={`Partner Deliverables Portal · ${user?.full_name || "Vendor"}`}
        description={`${data.vendor_info?.company || "Partner Studio"} · Assigned trade deliverables, schedules, and submission status.`}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost" onClick={() => void vendor.refresh()}>
              Refresh
            </button>
            <button className="button primary" onClick={() => alert("Upload deliverable modal")}>
              Upload Deliverable
            </button>
          </div>
        }
      />

      {/* Top 4 Metrics */}
      <div className="grid cards">
        <Metric
          label="Assigned Packages"
          value={summary.total ?? deliverables.length}
          hint="Trade deliverables under contract"
          icon="📦"
        />
        <Metric
          label="In Progress"
          value={summary.in_progress ?? 0}
          hint="Fabrication & site prep"
          icon="⚡"
        />
        <Metric
          label="Pending Submission"
          value={summary.pending ?? 0}
          hint="Awaiting trade submission"
          icon="⏳"
        />
        <Metric
          label="Completed & Verified"
          value={summary.completed ?? 0}
          hint="Signed off by site supervisor"
          icon="✓"
        />
      </div>

      {/* Deliverables Register */}
      <div style={{ marginTop: 24 }}>
        <Card title="Assigned Deliverables & Submission Status">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Deliverable Title</th>
                  <th>Priority</th>
                  <th>Submission Status</th>
                  <th>Progress</th>
                  <th>Target Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d: any) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.title}</strong>
                      <br />
                      <small className="muted">{d.description || "Trade deliverable"}</small>
                    </td>
                    <td>
                      <Badge label={d.priority} variant={d.priority === "high" ? "danger" : "default"} />
                    </td>
                    <td>
                      <Badge
                        label={d.submission_status}
                        variant={
                          d.submission_status === "Approved"
                            ? "brand"
                            : d.submission_status === "Under Review"
                            ? "warn"
                            : "default"
                        }
                      />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="row" style={{ gap: 6, alignItems: "center" }}>
                        <div className="progress" style={{ width: 60 }}>
                          <span style={{ width: `${d.progress}%` }} />
                        </div>
                        <small>{d.progress}%</small>
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>
                      {d.due_date ? new Date(d.due_date).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <button
                        className="button small ghost"
                        onClick={() => alert(`Submitting update for: ${d.title}`)}
                      >
                        Submit Update
                      </button>
                    </td>
                  </tr>
                ))}
                {!deliverables.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                      No active trade deliverables currently assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Assigned Project Progress */}
      <div style={{ marginTop: 20 }}>
        <Card title="Project Milestone Context">
          <div className="row between" style={{ marginBottom: 6 }}>
            <strong>{proj.project_name || "The Lumina Pavilion"}</strong>
            <span style={{ fontWeight: 700, color: "var(--brand)" }}>
              {proj.display_completed || "Completed: 68%"}
            </span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <span style={{ width: `${proj.overall_completion_pct || 68}%` }} />
          </div>
        </Card>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 5. DOCUMENTS & DRAWINGS PAGE (CLIENT & AUTHORIZED CONTRIBUTORS)
// ─────────────────────────────────────────────────────────────────────────────

export function DocumentsPage({ projectId, user }: { projectId: number; user: any }) {
  const docs = useRequest(() => api.documents.list(projectId), [projectId]);

  if (docs.loading) {
    return <Loading text="Loading architectural drawings and project specifications…" />;
  }

  if (docs.error) {
    return (
      <>
        <PageHeader
          title="Access Restricted"
          description="Confidential drawings are restricted to project clients."
        />
        <Card>
          <div className="notice error" style={{ marginBottom: 16 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛑</span>
              <div>
                <strong>403 Forbidden: Confidential Client Documents</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {docs.error}
                </p>
              </div>
            </div>
          </div>
          <Link className="button primary" href="/">
            Return to Dashboard
          </Link>
        </Card>
      </>
    );
  }

  const list = docs.data || [];

  return (
    <>
      <PageHeader
        title="Architectural Drawings & Specifications"
        description="Master CAD elevations, interior millwork schedules, and engineering reports."
      />

      <div className="grid two">
        {list.map((d: any) => (
          <div
            key={d.id}
            style={{
              padding: 18,
              borderRadius: "var(--radius)",
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="badge brand">{d.document_type}</span>
              <small className="muted">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "Current"}</small>
            </div>
            <strong style={{ fontSize: 16, color: "var(--text-bright)" }}>
              {d.title}
            </strong>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 12px" }}>
              {d.extracted_data || d.content}
            </p>
            <div className="row between">
              <a
                href={d.file_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="button small ghost"
                style={{ gap: 6 }}
              >
                <span>📥</span> View Drawing
              </a>
              <span className="badge small">Verified Document</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
