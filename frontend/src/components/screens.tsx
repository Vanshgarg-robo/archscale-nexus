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
} from "@/components/ui";
import {
  AdminPage,
  AlertsPage,
  ApprovalsPage,
  BlockersPage,
  ChangeRequestsPage,
  CommunicationsPage,
  DependenciesPage,
  GraphPage,
  MemoryPage,
  RisksPage,
  SimulatorPage,
  StakeholdersPage,
  SummariesPage,
  UserPage,
} from "@/components/workspace-pages";
import {
  AdminOperationsDashboard,
  ClientDashboard,
  ManagementDashboard,
  VendorDashboard,
  DocumentsPage,
} from "@/components/role-dashboards";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result =
        mode === "login"
          ? await api.auth.login(identifier, password)
          : await api.auth.register({
              email: identifier,
              username: username || identifier.split("@")[0],
              mobile_no: mobileNo || undefined,
              password,
              full_name: fullName,
              organization_name: organization,
              role: "viewer",
            });

      localStorage.setItem("archscale_token", result.access_token);
      localStorage.setItem("archscale_refresh_token", result.refresh_token);
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to authenticate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <section className="login-panel">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            ArchScale
            <small>NEXUS</small>
          </div>
        </div>

        <h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
        <p className="muted" style={{ margin: 0 }}>
          Coordination intelligence for high-complexity architecture and delivery projects.
        </p>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === "register" && (
            <>
              <div className="field">
                <label>Full name</label>
                <input
                  className="input"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                />
              </div>
              <div className="field">
                <label>Organization name</label>
                <input
                  className="input"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. ArchScale Design Studio"
                />
              </div>
              <div className="grid two">
                <div className="field">
                  <label>Username</label>
                  <input
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ananya"
                  />
                </div>
                <div className="field">
                  <label>Mobile number</label>
                  <input
                    className="input"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    placeholder="+91-98765-43210"
                  />
                </div>
              </div>
            </>
          )}

          <div className="field">
            <label>{mode === "login" ? "Email" : "Work email"}</label>
            <input
              className="input"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. name@company.com"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.75,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <ErrorNotice message={error} />}

          <button className="button primary" style={{ width: "100%", marginTop: 8 }} disabled={busy}>
            {busy ? "Authenticating…" : mode === "login" ? "Sign in to Nexus" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

export function WorkspaceScreen({
  route,
  projectId,
  user,
}: {
  route: string;
  projectId: number;
  user: any;
}) {
  const renderDashboard = () => {
    const role = user?.role || "viewer";
    if (role === "admin" || user?.is_superadmin) {
      return <AdminOperationsDashboard user={user} />;
    }
    if (role === "client") {
      return <ClientDashboard projectId={projectId} user={user} />;
    }
    if (role === "vendor" || role === "contractor") {
      return <VendorDashboard user={user} />;
    }
    return <ManagementDashboard user={user} />;
  };

  const paths: Record<string, React.ReactNode> = {
    "/": renderDashboard(),
    "/documents": <DocumentsPage projectId={projectId} user={user} />,
    "/impact": <ImpactPage projectId={projectId} />,
    "/chat": <ChatPage projectId={projectId} />,
    "/stakeholders": <StakeholdersPage projectId={projectId} />,
    "/dependencies": <DependenciesPage projectId={projectId} />,
    "/approvals": <ApprovalsPage projectId={projectId} />,
    "/blockers": <BlockersPage projectId={projectId} />,
    "/risks": <RisksPage projectId={projectId} />,
    "/change-requests": <ChangeRequestsPage projectId={projectId} user={user} />,
    "/communications": <CommunicationsPage projectId={projectId} />,
    "/knowledge-graph": <GraphPage projectId={projectId} />,
    "/memory": <MemoryPage projectId={projectId} />,
    "/simulator": <SimulatorPage projectId={projectId} />,
    "/summaries": <SummariesPage projectId={projectId} />,
    "/alerts": <AlertsPage projectId={projectId} />,
    "/user": <UserPage user={user} />,
  };

  if (route.startsWith("/admin")) {
    return <AdminPage route={route} user={user} />;
  }

  return (
    paths[route] || (
      <>
        <PageHeader
          title="Module not found"
          description="The requested workspace view is not configured or has moved."
        />
        <Card>
          <Empty title="Page not found">
            Select an active command or coordination module from the sidebar navigation.
          </Empty>
        </Card>
      </>
    )
  );
}

function Dashboard({ projectId, user }: { projectId: number; user: any }) {
  const dashboard = useRequest(() => api.dashboard(projectId), [projectId]);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const runDemo = async () => {
    setRunningAction("kitchen");
    setDemoNotice(null);
    try {
      const res = await api.demo.kitchen();
      setDemoNotice(res.message || "Kitchen redesign coordination chain triggered successfully.");
      await dashboard.refresh();
    } catch (e) {
      setDemoNotice(e instanceof Error ? e.message : "Failed to run kitchen scenario");
    } finally {
      setRunningAction(null);
    }
  };

  const resetDemo = async () => {
    setRunningAction("reset");
    setDemoNotice(null);
    try {
      const res = await api.demo.reset();
      setDemoNotice(res.message || "Project baseline restored successfully.");
      await dashboard.refresh();
    } catch (e) {
      setDemoNotice(e instanceof Error ? e.message : "Failed to reset demo");
    } finally {
      setRunningAction(null);
    }
  };

  if (dashboard.loading) return <Loading text="Fetching executive command metrics…" />;
  if (dashboard.error) {
    return <ErrorNotice message={dashboard.error} onRetry={() => void dashboard.refresh()} />;
  }

  const data = dashboard.data || {};
  const health = data.health || {};
  const tasks = data.task_summary || {};
  const risks = data.risks || {};

  return (
    <>
      <PageHeader
        title={`Executive Command${user ? ` · ${user.full_name}` : ""}`}
        description="Live operational posture across architectural delivery, governance gates, and risk ripple."
        actions={
          <>
            <button className="button ghost" onClick={() => void dashboard.refresh()}>
              Refresh data
            </button>
            <button
              className="button danger"
              onClick={() => void resetDemo()}
              disabled={Boolean(runningAction)}
            >
              {runningAction === "reset" ? "Resetting…" : "Reset demo"}
            </button>
            <button
              className="button primary"
              onClick={() => void runDemo()}
              disabled={Boolean(runningAction)}
            >
              {runningAction === "kitchen" ? "Triggering chain…" : "Run kitchen scenario"}
            </button>
          </>
        }
      />

      {demoNotice && (
        <div className="notice success" style={{ marginBottom: 18 }}>
          <div className="row between">
            <span>{demoNotice}</span>
            <button className="button small ghost" onClick={() => setDemoNotice(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top 4 Metrics */}
      <div className="grid cards">
        <Metric
          label="Project health"
          value={`${health.score ?? "—"}/100`}
          hint={`${health.status || "Calculating"} posture`}
          icon="🛡️"
        />
        <Metric
          label="Task completion"
          value={`${tasks.completion_rate ?? 0}%`}
          hint={`${tasks.completed || 0} of ${tasks.total || 0} tasks complete`}
          icon="✓"
        />
        <Metric
          label="Active blockers"
          value={health.blocker_count ?? (data.blockers?.length || 0)}
          hint={`${data.pending_approvals?.length || 0} approvals waiting`}
          icon="🚫"
        />
        <Metric
          label="Risk register"
          value={risks.total_risks ?? 0}
          hint={`${risks.by_severity?.critical || 0} critical risks tracked`}
          icon="⚠️"
        />
      </div>

      {/* Row 2: Health Trajectory & AI Recommendations */}
      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Project Health Trajectory">
          <div className="row between">
            <div>
              <div className="metric-value">{health.score ?? "—"}</div>
              <span className="muted">
                Synthesized across schedule, risks, approvals, and dependencies
              </span>
            </div>
            <Status value={health.status} />
          </div>

          <div className="progress" style={{ marginTop: 18 }}>
            <span style={{ width: `${Math.min(100, Math.max(0, health.score || 0))}%` }} />
          </div>

          <div className="grid three" style={{ marginTop: 18 }}>
            <div>
              <small className="muted">Overdue tasks</small>
              <div style={{ fontSize: 18, fontWeight: 700, color: health.overdue_tasks ? "var(--danger)" : "var(--brand)" }}>
                {health.overdue_tasks ?? 0}
              </div>
            </div>
            <div>
              <small className="muted">Dependency chain blocks</small>
              <div style={{ fontSize: 18, fontWeight: 700, color: health.dependency_failures ? "var(--warn)" : "var(--brand)" }}>
                {health.dependency_failures ?? 0}
              </div>
            </div>
            <div>
              <small className="muted">Active risks</small>
              <div style={{ fontSize: 18, fontWeight: 700, color: health.risk_count ? "var(--warn)" : "var(--brand)" }}>
                {health.risk_count ?? 0}
              </div>
            </div>
          </div>
        </Card>

        <Card title="AI Coordination Recommendations">
          <div className="list">
            {(data.recommendations || []).map((rec: string, index: number) => (
              <div className="list-item" key={index}>
                <span style={{ fontSize: 13.5 }}>{rec}</span>
                <span className="muted" style={{ fontWeight: 700 }}>›</span>
              </div>
            ))}
            {!(data.recommendations || []).length && (
              <Empty title="No recommendations">
                AI recommendations will dynamically generate as project activity evolves.
              </Empty>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Priority Blockers & Latest Change Requests */}
      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Priority Blockers">
          <div className="list">
            {(data.blockers || []).map((blocker: any) => (
              <div className="list-item" key={blocker.id}>
                <div>
                  <strong>{blocker.title}</strong>
                  <br />
                  <small className="muted">{blocker.reason}</small>
                  {blocker.owner_name && (
                    <div style={{ marginTop: 4 }}>
                      <small>Owner: {blocker.owner_name}</small>
                    </div>
                  )}
                </div>
                <Status value={blocker.severity} />
              </div>
            ))}
            {!(data.blockers || []).length && (
              <Empty title="Zero active blockers">
                All critical work paths and approval gates are presently clear.
              </Empty>
            )}
          </div>
        </Card>

        <Card title="Latest Change Requests">
          <div className="list">
            {(data.change_requests || []).map((change: any) => (
              <div className="list-item" key={change.id}>
                <div>
                  <strong>{change.title}</strong>
                  <br />
                  <small className="muted">
                    Risk assessment: <Status value={change.risk_level} />
                  </small>
                </div>
                <Status value={change.status} />
              </div>
            ))}
            {!(data.change_requests || []).length && (
              <Empty title="No change requests">
                No active scope changes or architectural modifications logged.
              </Empty>
            )}
          </div>
        </Card>
      </div>

      {/* Row 4: Recent Decisions & Stakeholder Activity */}
      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Recent Decisions Log">
          <div className="list">
            {(data.recent_decisions || []).map((decision: any) => (
              <div className="list-item" key={decision.id}>
                <div>
                  <strong>{decision.title}</strong>
                  <br />
                  <small className="muted">{decision.rationale}</small>
                  <div style={{ marginTop: 4 }}>
                    <small>
                      Decided by {decision.decided_by || "Stakeholder"} · {formatDate(decision.decided_at)}
                    </small>
                  </div>
                </div>
                <Badge label="Decided" variant="blue" />
              </div>
            ))}
            {!(data.recent_decisions || []).length && (
              <Empty title="No decisions recorded">
                Documented architectural and structural decisions will appear here.
              </Empty>
            )}
          </div>
        </Card>

        <Card title="Stakeholder Engagement & Influence">
          <div className="list">
            {(data.stakeholder_activity || []).map((s: any) => (
              <div className="list-item" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <br />
                  <Status value={s.role} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <small className="muted">Influence score</small>
                  <div style={{ fontWeight: 700, color: "var(--brand)" }}>
                    {s.influence_score ? `${Math.round(s.influence_score)}/100` : "—"}
                  </div>
                </div>
              </div>
            ))}
            {!(data.stakeholder_activity || []).length && (
              <Empty title="No stakeholder activity">
                Stakeholders assigned to this project will be listed here.
              </Empty>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function ImpactPage({ projectId }: { projectId: number }) {
  const tasks = useRequest(() => api.tasks.list(projectId), [projectId]);
  const [description, setDescription] = useState("Move the kitchen island 1.2m towards the terrace window");
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.impact({
        project_id: projectId,
        change_description: description,
        affected_task_ids: selected,
      });
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impact cascade analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="AI Impact Engine"
        description="Simulate a proposed design or scope change to trace its downstream delivery ripple through tasks, trades, vendors, and governance."
      />

      <div className="grid two">
        <Card title="Specify Proposed Change">
          <form className="stack" onSubmit={run}>
            <div className="field">
              <label>Change Description</label>
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="e.g. Relocate kitchen island 1.2m and change countertop to Calacatta quartz waterfall edge"
              />
            </div>

            <div className="field">
              <label>Starting Target Tasks (optional)</label>
              <div
                className="list"
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {tasks.data?.map((task: any) => (
                  <label
                    className="row"
                    key={task.id}
                    style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 4 }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(task.id)}
                      onChange={() =>
                        setSelected((items) =>
                          items.includes(task.id)
                            ? items.filter((id) => id !== task.id)
                            : [...items, task.id]
                        )
                      }
                    />
                    <span style={{ fontSize: 13 }}>{task.title}</span>
                  </label>
                ))}
                {!(tasks.data || []).length && <Empty>Loading project tasks…</Empty>}
              </div>
            </div>

            {error && <ErrorNotice message={error} />}

            <button className="button primary" disabled={busy}>
              {busy ? "Mapping Downstream Cascades…" : "Run Cascade Analysis"}
            </button>
          </form>
        </Card>

        <Card title="Cascade Analysis Assessment">
          {!result ? (
            <Empty title="Awaiting simulation">
              Describe the proposed modification and run the analysis. The AI impact engine will traverse the dependency graph and compute schedule and trade exposure.
            </Empty>
          ) : (
            <div className="stack">
              <div className="row between">
                <strong>Assessed Risk Severity</strong>
                <Status value={result.risk_level} />
              </div>

              <div className="notice">
                Critical Path Delay Effect: <strong>{result.estimated_delay_days} business days</strong>
                {result.coordination_notes && (
                  <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>
                    {result.coordination_notes}
                  </p>
                )}
              </div>

              <div style={{ marginTop: 6 }}>
                <strong>Affected Downstream Tasks ({result.affected_tasks?.length || 0})</strong>
                <div className="flow" style={{ marginTop: 8 }}>
                  {(result.affected_tasks || []).map((task: any) => (
                    <div className="flow-node" key={task.id || task.title}>
                      <div className="row between">
                        <strong>{task.title}</strong>
                        <Status value={task.status} />
                      </div>
                      <small className="muted">
                        Cascade Depth: {task.depth ?? 1} · Assignee: {task.assignee || "Unassigned"}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {result && (
        <div className="grid two" style={{ marginTop: 16 }}>
          <Card title="Affected Stakeholders & Vendors">
            <div className="list">
              {(result.affected_stakeholders || []).map((person: any, idx: number) => (
                <div className="list-item" key={person.id || idx}>
                  <div>
                    <strong>{person.name}</strong>
                    {person.impact && <div style={{ fontSize: 12, color: "var(--muted)" }}>{person.impact}</div>}
                  </div>
                  <Status value={person.role} />
                </div>
              ))}
              {!(result.affected_stakeholders || []).length && (
                <Empty title="No direct stakeholder alerts" />
              )}
            </div>
          </Card>

          <Card title="Recommended Coordination Actions">
            <div className="list">
              {(result.recommendations || []).map((item: string, index: number) => (
                <div className="list-item" key={index}>
                  <span>{item}</span>
                  <Badge label={`Priority ${index + 1}`} variant="warn" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function ChatPage({ projectId }: { projectId: number }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content:
        "Hello, I am your ArchScale Nexus AI Project Manager. Ask about active blockers, overdue approvals, critical path exposure, or trade coordination on this project.",
    },
  ]);
  const [busy, setBusy] = useState(false);

  const promptSuggestions = [
    "What tasks are currently blocked?",
    "Summarize critical path risks for this project",
    "What approvals are overdue and who owns them?",
    "What did Rajiv Mehra decide about the kitchen island?",
    "Explain the marble delivery status and port clearance",
  ];

  const send = async (textToSend?: string) => {
    const text = (textToSend || message).trim();
    if (!text || busy) return;

    const history = messages.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content,
    }));

    setMessages((all) => [...all, { role: "user", content: text }]);
    setMessage("");
    setBusy(true);

    try {
      const result = await api.ai.chat({
        project_id: projectId,
        message: text,
        history,
      });

      setMessages((all) => [...all, { role: "assistant", content: result.response }]);
    } catch (cause) {
      setMessages((all) => [
        ...all,
        {
          role: "assistant",
          content: cause instanceof Error ? `Assistant error: ${cause.message}` : "Unable to generate reply.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="AI Project Manager Chat"
        description="Grounded conversational intelligence operating directly across active tasks, dependencies, governance sign-offs, and project memory."
        actions={
          <button
            className="button small ghost"
            onClick={() =>
              setMessages([
                {
                  role: "assistant",
                  content:
                    "Chat reset. Ask about active blockers, overdue approvals, critical path exposure, or trade coordination on this project.",
                },
              ])
            }
          >
            Clear chat
          </button>
        }
      />

      <div className="chips">
        {promptSuggestions.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="chip"
            onClick={() => void send(prompt)}
            disabled={busy}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <div className="row" style={{ gap: 8 }}>
            <span style={{ color: "var(--brand)" }}>◉</span>
            <strong>Nexus AI Project Manager</strong>
            <Badge label="Grounded in Project Context" variant="brand" />
          </div>
        </div>

        <div className="messages">
          {messages.map((item, index) => (
            <div key={index} className={`message ${item.role}`}>
              <div className="message-meta">
                <span>{item.role === "user" ? "You" : "ArchScale AI Copilot"}</span>
              </div>
              {item.content}
            </div>
          ))}
          {busy && (
            <div className="message assistant">
              <div className="message-meta">
                <span>ArchScale AI Copilot</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span>Reviewing project state and calculating answer…</span>
              </div>
            </div>
          )}
        </div>

        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about blockers, drawing sign-offs, critical dependencies…"
            disabled={busy}
          />
          <button className="button primary" disabled={busy || !message.trim()}>
            Send
          </button>
        </form>
      </div>
    </>
  );
}
