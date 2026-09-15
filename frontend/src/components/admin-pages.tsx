"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Card,
  Empty,
  ErrorNotice,
  formatDate,
  formatDateTime,
  Loading,
  Metric,
  PageHeader,
  Status,
  useRequest,
  Badge,
  Modal,
} from "@/components/ui";

export function AdminPage({ route, user }: { route: string; user: any }) {
  if (!user) {
    return (
      <>
        <PageHeader
          title="Administration Portal"
          description="Sign in with administrator credentials to manage platform governance, identities, and runtime systems."
        />
        <Card>
          <Empty title="Authentication Required">
            <p>You must be signed in with an administrator account to view this section.</p>
            <Link className="button primary" href="/login">
              Sign in as Administrator
            </Link>
          </Empty>
        </Card>
      </>
    );
  }

  const isAdmin = user.role === "admin" || user.is_superadmin;
  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Access Denied"
          description="Administrative privileges are required to inspect or modify governance controls."
        />
        <Card>
          <div className="notice error" style={{ marginBottom: 16 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 22 }}>🛑</span>
              <div>
                <strong>403 Forbidden: Administrator Role Required</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Your current account identity (<strong>{user.email}</strong>) possesses the role{" "}
                  <Status value={user.role} />. Administrative functions require an elevated account
                  (such as <code>admin@archscale.io</code>).
                </p>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <Link className="button ghost" href="/">
              Return to Workspace
            </Link>
            <Link className="button primary" href="/login">
              Switch to Admin Account
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const screens: Record<string, React.ReactNode> = {
    "/admin": <AdminOverview />,
    "/admin/users": <Users />,
    "/admin/roles": <Roles />,
    "/admin/audit-logs": <AuditLogs />,
    "/admin/monitoring": <Monitoring />,
    "/admin/notifications": <AdminNotifications />,
    "/admin/ai-assistant": <AIControls />,
    "/admin/settings": <Settings />,
  };

  return (
    screens[route] || (
      <>
        <PageHeader
          title="Administration"
          description="Select an administrative module from the navigation sidebar."
        />
        <Card>
          <Empty title="Module not configured">
            This administration view is not available or has been reorganized.
          </Empty>
        </Card>
      </>
    )
  );
}

function AdminOverview() {
  const overview = useRequest(() => api.admin.dashboard(), []);

  if (overview.loading) return <Loading text="Fetching administrative telemetry…" />;
  if (overview.error) {
    return <ErrorNotice message={overview.error} onRetry={() => void overview.refresh()} />;
  }

  const data = overview.data || {};

  return (
    <>
      <PageHeader
        title="Administration Overview"
        description="Monitor tenant adoption, operational health, RBAC allocations, and recent governance events."
      />

      <div className="grid cards">
        <Metric
          label="Total users"
          value={data.total_users || 0}
          hint={`${data.active_users || 0} active identities`}
          icon="👥"
        />
        <Metric label="Online sessions" value={data.online_users || 0} icon="🌐" />
        <Metric label="Targets tracked" value={data.targets_tracked || 0} icon="🎯" />
        <Metric label="Alerts generated" value={data.alerts_generated || 0} icon="🔔" />
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Platform Runtime Posture">
          <div className="list">
            <div className="list-item">
              <span>Database Cluster</span>
              <Status value={data.database_status} />
            </div>
            <div className="list-item">
              <span>Application Server</span>
              <Status value={data.server_health} />
            </div>
            <div className="list-item">
              <span>API Gateway</span>
              <Status value={data.api_health} />
            </div>
          </div>

          <h3 style={{ marginTop: 20, marginBottom: 12 }}>User Distribution by Role</h3>
          <div className="list">
            {Object.entries(data.users_by_role || {}).map(([role, count]) => (
              <div className="list-item" key={role}>
                <Status value={role} />
                <strong>{String(count)} users</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Governance Audits">
          <div className="list">
            {(data.recent_audit_logs || []).map((log: any) => (
              <div className="list-item" key={log.id}>
                <div>
                  <strong>{log.action.replaceAll("_", " ")}</strong>
                  <br />
                  <small className="muted">
                    {log.user_name || log.user_email || "System"} · {formatDate(log.created_at)}
                  </small>
                </div>
                <Status value={log.status} />
              </div>
            ))}
            {!(data.recent_audit_logs || []).length && (
              <Empty title="No recent audits">Platform audit records will stream here.</Empty>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function Users() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const resource = useRequest(() => api.admin.users({ search, role: roleFilter || undefined }), [
    search,
    roleFilter,
  ]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    role: "viewer",
    mobile_no: "",
  });

  const [editingUser, setEditingUser] = useState<any>(null);
  const [resettingUser, setResettingUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    try {
      await api.admin.createUser(form);
      setForm({
        full_name: "",
        email: "",
        username: "",
        password: "",
        role: "viewer",
        mobile_no: "",
      });
      setCreateModalOpen(false);
      setNotice("User created successfully.");
      await resource.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Unable to create user");
    }
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    setNotice("");
    try {
      await api.admin.updateUser(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        username: editingUser.username,
        mobile_no: editingUser.mobile_no,
        role: editingUser.role,
      });
      setEditModalOpen(false);
      setNotice("User updated successfully.");
      await resource.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Unable to update user");
    }
  };

  const submitResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!resettingUser) return;
    setNotice("");
    try {
      await api.admin.resetPassword(resettingUser.id, newPassword);
      setPasswordModalOpen(false);
      setNewPassword("");
      setNotice(`Password reset for ${resettingUser.email}`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Password reset failed");
    }
  };

  const toggle = async (id: number) => {
    try {
      await api.admin.toggleUser(id);
      await resource.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Unable to toggle status");
    }
  };

  const deleteUserAction = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;
    try {
      await api.admin.deleteUser(id);
      setNotice(`User ${email} deleted.`);
      await resource.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Delete failed");
    }
  };

  const rolesList = [
    "viewer",
    "project_manager",
    "architect",
    "engineer",
    "contractor",
    "client",
    "vendor",
    "site_supervisor",
    "analyst",
    "operator",
    "admin",
  ];

  return (
    <>
      <PageHeader
        title="User Identity Management"
        description="Provision platform identities, assign RBAC access roles, and audit access credentials."
        actions={
          <button className="button primary" onClick={() => setCreateModalOpen(true)}>
            + Create user
          </button>
        }
      />

      {notice && <div className="notice success" style={{ marginBottom: 16 }}>{notice}</div>}

      <Card title="Workspace Users Directory">
        <div className="row between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 340 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, username, or mobile…"
          />
          <select
            className="select"
            style={{ maxWidth: 200 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {rolesList.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {resource.loading ? (
          <Loading text="Retrieving user identities…" />
        ) : resource.error ? (
          <ErrorNotice message={resource.error} onRetry={() => void resource.refresh()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Sign In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.users?.map((member: any) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.full_name}</strong>
                      <br />
                      <small className="muted">
                        {member.email} · @{member.username || "—"}
                        {member.mobile_no && ` · ${member.mobile_no}`}
                      </small>
                    </td>
                    <td>
                      <Status value={member.role} />
                    </td>
                    <td>
                      <Status value={member.is_active ? "active" : "inactive"} />
                    </td>
                    <td>{formatDateTime(member.last_login_at)}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="button small ghost"
                          onClick={() => {
                            setEditingUser({ ...member });
                            setEditModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button small ghost"
                          onClick={() => {
                            setResettingUser(member);
                            setPasswordModalOpen(true);
                          }}
                        >
                          Reset PW
                        </button>
                        <button
                          className="button small ghost"
                          onClick={() => void toggle(member.id)}
                        >
                          {member.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="button small danger"
                          onClick={() => void deleteUserAction(member.id, member.email)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New User"
        maxWidth={560}
      >
        <form className="stack" onSubmit={submitCreate}>
          <div className="grid two">
            <div className="field">
              <label>Full Name</label>
              <input
                className="input"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Vikram Patel"
              />
            </div>
            <div className="field">
              <label>Email Address</label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="vikram@archscale.io"
              />
            </div>
          </div>
          <div className="grid two">
            <div className="field">
              <label>Username</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="vikram"
              />
            </div>
            <div className="field">
              <label>Mobile Number</label>
              <input
                className="input"
                value={form.mobile_no}
                onChange={(e) => setForm({ ...form, mobile_no: e.target.value })}
                placeholder="+91-98765-43212"
              />
            </div>
          </div>
          <div className="grid two">
            <div className="field">
              <label>Initial Password (min 8 chars)</label>
              <input
                className="input"
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Assigned Role</label>
              <select
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {rolesList.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row between" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="button ghost"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button className="button primary">Create Identity</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Identity"
        maxWidth={560}
      >
        {editingUser && (
          <form className="stack" onSubmit={submitEdit}>
            <div className="grid two">
              <div className="field">
                <label>Full Name</label>
                <input
                  className="input"
                  required
                  value={editingUser.full_name || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, full_name: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid two">
              <div className="field">
                <label>Username</label>
                <input
                  className="input"
                  value={editingUser.username || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Mobile Number</label>
                <input
                  className="input"
                  value={editingUser.mobile_no || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, mobile_no: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="field">
              <label>Assigned Role</label>
              <select
                className="select"
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                {rolesList.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="row between" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Admin Password Reset"
        maxWidth={440}
      >
        {resettingUser && (
          <form className="stack" onSubmit={submitResetPassword}>
            <p className="muted" style={{ margin: 0 }}>
              Set a new password for <strong>{resettingUser.email}</strong>.
            </p>
            <div className="field">
              <label>New Password (min 8 chars)</label>
              <input
                className="input"
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="row between" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setPasswordModalOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary">Reset Password</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Roles() {
  const roles = useRequest(() => api.admin.roles(), []);

  if (roles.loading) return <Loading text="Loading RBAC permissions catalog…" />;
  if (roles.error) {
    return <ErrorNotice message={roles.error} onRetry={() => void roles.refresh()} />;
  }

  const list = roles.data || [];

  return (
    <>
      <PageHeader
        title="Roles & Access Permissions"
        description="ArchScale Nexus enforces strict granular permission whitelists per system role."
      />

      <div className="grid three">
        {list.map((role: any) => (
          <Card key={role.role} title={role.role.replaceAll("_", " ")}>
            <div className="row between">
              <Status value={role.role} />
              <Badge label={`${role.user_count} assigned`} variant="default" />
            </div>
            <div className="list" style={{ marginTop: 14 }}>
              {role.permissions.map((permission: string) => (
                <div
                  key={permission}
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "var(--brand)" }}>✓</span>
                  <span>{permission.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function AuditLogs() {
  const [search, setSearch] = useState("");
  const logs = useRequest(() => api.admin.audits({ search }), [search]);

  if (logs.loading) return <Loading text="Reading operational audit logs…" />;
  if (logs.error) {
    return <ErrorNotice message={logs.error} onRetry={() => void logs.refresh()} />;
  }

  const list = logs.data?.logs || [];

  return (
    <>
      <PageHeader
        title="Operational Audit Logs"
        description="Immutable, tamper-evident record of user authentication, RBAC policy changes, and governance events."
      />

      <Card title={`${logs.data?.total || 0} Recorded Audit Events`}>
        <div className="row" style={{ marginBottom: 14 }}>
          <input
            className="input"
            style={{ maxWidth: 340 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit actor, action, or status…"
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource Target</th>
                <th>IP Origin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((log: any) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>
                    <strong>{log.user_name || log.user_email || "System"}</strong>
                  </td>
                  <td>
                    <Badge label={log.action.replaceAll("_", " ")} variant="blue" />
                  </td>
                  <td>
                    {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ""}
                  </td>
                  <td>
                    <code>{log.ip_address || "127.0.0.1"}</code>
                  </td>
                  <td>
                    <Status value={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <Empty title="Zero matching audit logs" />}
      </Card>
    </>
  );
}

function Monitoring() {
  const health = useRequest(() => api.admin.system(), []);

  if (health.loading) return <Loading text="Sampling real-time system metrics…" />;
  if (health.error) {
    return <ErrorNotice message={health.error} onRetry={() => void health.refresh()} />;
  }

  const data = health.data || {};

  return (
    <>
      <PageHeader
        title="System Telemetry & Monitoring"
        description="Live diagnostics measuring API throughput, SQLite persistence latency, process memory, and compute load."
        actions={
          <button className="button ghost" onClick={() => void health.refresh()}>
            Refresh Telemetry
          </button>
        }
      />

      <div className="grid cards">
        <Metric
          label="API health"
          value={data.api_status || "Online"}
          hint="FastAPI async engine"
          icon="⚡"
        />
        <Metric
          label="Database latency"
          value={data.database_response_ms >= 0 ? `${data.database_response_ms}ms` : "OK"}
          hint={data.database_connected ? "Connected" : "Disconnected"}
          icon="🗄️"
        />
        <Metric
          label="Process memory"
          value={`${data.memory_usage_mb || 0} MB`}
          hint="Resident set size"
          icon="💾"
        />
        <Metric
          label="CPU compute"
          value={`${data.cpu_usage_percent || 0}%`}
          hint="Host core utilization"
          icon="⚙️"
        />
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="Runtime Environment Health">
          <div className="list">
            <div className="list-item">
              <span>Database Connection</span>
              <Status value={data.database_connected ? "healthy" : "critical"} />
            </div>
            <div className="list-item">
              <span>Server Uptime</span>
              <strong>{Math.floor((data.server_uptime_seconds || 0) / 60)} minutes</strong>
            </div>
            <div className="list-item">
              <span>Active User Identities</span>
              <strong>{data.active_users || 0}</strong>
            </div>
            <div className="list-item">
              <span>Active Online Sessions</span>
              <strong>{data.online_sessions || 0}</strong>
            </div>
          </div>
        </Card>

        <Card title="Operational Volumes & Workloads">
          <div className="list">
            <div className="list-item">
              <span>Radar Nodes Connected</span>
              <strong>{data.radar_nodes_connected || 0}</strong>
            </div>
            <div className="list-item">
              <span>Delivery Targets Tracked</span>
              <strong>{data.targets_tracked || 0}</strong>
            </div>
            <div className="list-item">
              <span>Alert Notifications Generated</span>
              <strong>{data.alerts_generated || 0}</strong>
            </div>
            <div className="list-item">
              <span>Recorded Exception Faults</span>
              <strong>{data.error_count || 0}</strong>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function AdminNotifications() {
  const notifications = useRequest(() => api.admin.notifications(), []);
  const [acting, setActing] = useState(false);

  const markOne = async (id: number) => {
    await api.admin.readAdminNotification(id);
    await notifications.refresh();
  };

  const markAll = async () => {
    setActing(true);
    try {
      await api.admin.markAllRead();
      await notifications.refresh();
    } finally {
      setActing(false);
    }
  };

  if (notifications.loading) return <Loading text="Fetching administrative alerts…" />;
  if (notifications.error) {
    return <ErrorNotice message={notifications.error} onRetry={() => void notifications.refresh()} />;
  }

  const list = notifications.data?.notifications || [];
  const unread = notifications.data?.unread_count || 0;

  return (
    <>
      <PageHeader
        title="Admin Notifications"
        description="Operational alerts, user creation notices, and platform security flags."
        actions={
          unread > 0 && (
            <button className="button small primary" onClick={() => void markAll()} disabled={acting}>
              {acting ? "Marking…" : "Mark all as read"}
            </button>
          )
        }
      />

      <Card title={`${unread} Unread Notifications (${list.length} total)`}>
        <div className="list">
          {list.map((n: any) => (
            <div className="list-item" key={n.id}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <strong>{n.title}</strong>
                  {!n.is_read && <Badge label="Unread" variant="brand" />}
                </div>
                <small className="muted">{n.message}</small>
                <div style={{ marginTop: 4 }}>
                  <small>{formatDateTime(n.created_at)}</small>
                </div>
              </div>
              <div className="row">
                <Status value={n.notification_type} />
                {!n.is_read && (
                  <button className="button small ghost" onClick={() => void markOne(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
          {!list.length && <Empty title="Zero administrative alerts" />}
        </div>
      </Card>
    </>
  );
}

function AIControls() {
  const settings = useRequest(() => api.assistant.configAdmin(), []);
  const usage = useRequest(() => api.assistant.usage(), []);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const data = form || settings.data;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      await api.assistant.updateConfig({
        is_enabled: data.is_enabled,
        model_name: data.model_name,
        provider: data.provider,
        temperature: Number(data.temperature),
        max_tokens: Number(data.max_tokens),
        rate_limit_per_minute: Number(data.rate_limit_per_minute),
        system_prompt: data.system_prompt,
      });
      setNotice("AI Assistant policy saved and deployed.");
      setForm(null);
      await settings.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  if (settings.loading || usage.loading) {
    return <Loading text="Loading AI Assistant configurations & usage telemetry…" />;
  }
  if (settings.error || usage.error) {
    return (
      <ErrorNotice
        message={settings.error || usage.error}
        onRetry={() => {
          void settings.refresh();
          void usage.refresh();
        }}
      />
    );
  }

  const u = usage.data || {};

  return (
    <>
      <PageHeader
        title="AI Assistant Governance & Analytics"
        description="Configure runtime AI models, rate limits, system prompts, and monitor token consumption."
      />

      <div className="grid cards">
        <Metric label="Conversations" value={u.total_sessions || 0} icon="💬" />
        <Metric label="Messages routed" value={u.total_messages || 0} icon="📨" />
        <Metric label="Tokens processed" value={u.total_tokens || 0} icon="🔢" />
        <Metric
          label="Average latency"
          value={u.avg_latency_ms ? `${Math.round(u.avg_latency_ms)}ms` : "—"}
          icon="⚡"
        />
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <Card title="AI Policy & Engine Configuration">
          <form className="stack" onSubmit={save}>
            <div className="row between" style={{ padding: "8px 0" }}>
              <div>
                <strong>Assistant Master Switch</strong>
                <p className="card-subtitle">Enable or disable the AI copilot globally</p>
              </div>
              <input
                type="checkbox"
                style={{ width: 20, height: 20, accentColor: "var(--brand)" }}
                checked={Boolean(data?.is_enabled)}
                onChange={(e) => setForm({ ...data, is_enabled: e.target.checked })}
              />
            </div>

            <div className="grid two">
              <div className="field">
                <label>Provider</label>
                <select
                  className="select"
                  value={data?.provider || "gemini"}
                  onChange={(e) => setForm({ ...data, provider: e.target.value })}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div className="field">
                <label>Model Name</label>
                <input
                  className="input"
                  value={data?.model_name || ""}
                  onChange={(e) => setForm({ ...data, model_name: e.target.value })}
                  placeholder="gemini-2.5-flash"
                />
              </div>
            </div>

            <div className="grid two">
              <div className="field">
                <label>Temperature (0.0 - 2.0)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={data?.temperature ?? 0.7}
                  onChange={(e) => setForm({ ...data, temperature: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Max Output Tokens</label>
                <input
                  className="input"
                  type="number"
                  value={data?.max_tokens ?? 2000}
                  onChange={(e) => setForm({ ...data, max_tokens: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label>Rate Limit (requests / minute)</label>
              <input
                className="input"
                type="number"
                value={data?.rate_limit_per_minute ?? 30}
                onChange={(e) => setForm({ ...data, rate_limit_per_minute: e.target.value })}
              />
            </div>

            <div className="field">
              <label>System Grounding Prompt</label>
              <textarea
                className="textarea"
                style={{ minHeight: 120 }}
                value={data?.system_prompt || ""}
                onChange={(e) => setForm({ ...data, system_prompt: e.target.value })}
              />
            </div>

            {notice && <div className="notice success">{notice}</div>}

            <button className="button primary" disabled={saving}>
              {saving ? "Saving AI Policy…" : "Save AI Policy"}
            </button>
          </form>
        </Card>

        <Card title="Usage Telemetry & Popular Routes">
          <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)" }}>
            Popular Routes
          </h4>
          <div className="list">
            {(u.popular_routes || []).map((item: any) => (
              <div className="list-item" key={item.route}>
                <code>{item.route}</code>
                <Badge label={`${item.count} queries`} variant="blue" />
              </div>
            ))}
            {!(u.popular_routes || []).length && (
              <Empty title="No route statistics yet" />
            )}
          </div>

          <h4 style={{ margin: "20px 0 10px", fontSize: 13, color: "var(--muted)" }}>
            Daily Request Breakdown
          </h4>
          <div className="list">
            {(u.daily_usage || []).map((item: any) => (
              <div className="list-item" key={item.date}>
                <span>{item.date}</span>
                <small>
                  {item.queries} requests · {item.tokens} tokens
                </small>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Settings() {
  return (
    <>
      <PageHeader
        title="Platform Security Architecture & Settings"
        description="Platform credentials, token secrets, and database endpoints are strictly isolated to protected server environment variables."
      />

      <Card title="Secret Isolation Architecture">
        <div className="stack">
          <div className="notice success">
            <strong>🔒 Security Isolation Verified:</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>
              In compliance with production security standards, database passwords, JWT signing keys,
              AI provider API tokens (Google Gemini / OpenAI), and cloud storage credentials are never
              exposed to the browser bundle. They remain exclusively encapsulated within the backend server
              runtime (<code>backend/.env</code>).
            </p>
          </div>

          <div className="list" style={{ marginTop: 10 }}>
            <div className="list-item">
              <div>
                <strong>Database Engine</strong>
                <br />
                <small className="muted">SQLAlchemy Async Engine with aiosqlite / asyncpg</small>
              </div>
              <Badge label="Server Managed" variant="brand" />
            </div>

            <div className="list-item">
              <div>
                <strong>JWT & Session Lifecycle</strong>
                <br />
                <small className="muted">
                  HS256 signature with 15-minute access tokens and 7-day refresh tokens
                </small>
              </div>
              <Badge label="Server Managed" variant="brand" />
            </div>

            <div className="list-item">
              <div>
                <strong>AI Provider Credentials</strong>
                <br />
                <small className="muted">
                  Google Gemini & fallback OpenAI keys injected exclusively on backend startup
                </small>
              </div>
              <Badge label="Server Managed" variant="brand" />
            </div>

            <div className="list-item">
              <div>
                <strong>CORS Origin Whitelist</strong>
                <br />
                <small className="muted">
                  Restricted to authorized frontends (http://localhost:3000, production domains)
                </small>
              </div>
              <Badge label="Active" variant="blue" />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
