"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Assistant } from "@/components/assistant";
import { LoginScreen, WorkspaceScreen } from "@/components/screens";
import { Loading, Badge } from "@/components/ui";

type Project = { id: number; name: string; health_score?: number };

interface NavGroup {
  title: string;
  adminOnly?: boolean;
  links: [string, string, string][];
}

const navGroups: NavGroup[] = [
  {
    title: "Command Centre",
    links: [
      ["⌘", "Executive dashboard", "/"],
      ["⚡", "AI impact analysis", "/impact"],
      ["💬", "AI project manager", "/chat"],
      ["👤", "My profile", "/user"],
    ],
  },
  {
    title: "Coordination",
    links: [
      ["👥", "Stakeholders matrix", "/stakeholders"],
      ["☊", "Dependencies & path", "/dependencies"],
      ["✓", "Approvals & history", "/approvals"],
      ["⛔", "Blockers", "/blockers"],
      ["▲", "Risk mitigation", "/risks"],
      ["↗", "Change requests", "/change-requests"],
      ["✉", "Communications", "/communications"],
    ],
  },
  {
    title: "Intelligence",
    links: [
      ["◌", "Project memory", "/memory"],
      ["▣", "What-if simulator", "/simulator"],
      ["≋", "AI summaries", "/summaries"],
      ["!", "Coordination alerts", "/alerts"],
    ],
  },
  {
    title: "Administration",
    adminOnly: true,
    links: [
      ["⚙", "Admin overview", "/admin"],
      ["♙", "Users", "/admin/users"],
      ["⌘", "Roles & permissions", "/admin/roles"],
      ["◫", "Audit logs", "/admin/audit-logs"],
      ["◌", "System monitoring", "/admin/monitoring"],
      ["✦", "AI controls", "/admin/ai-assistant"],
      ["●", "Admin notifications", "/admin/notifications"],
      ["⚡", "Platform settings", "/admin/settings"],
    ],
  },
];

export function AppShell({ route }: { route: string }) {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(1);
  const [ready, setReady] = useState(route === "/login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (route === "/login") return;

    const setup = async () => {
      const saved = Number(localStorage.getItem("archscale_project_id"));
      if (saved) setProjectId(saved);

      try {
        const me = await api.auth.me();
        setUser(me);
      } catch {
        // Unauthenticated users can view workspace and public demos
      }

      try {
        const found = await api.projects.list();
        setProjects(found);
        const valid = found.some((p) => p.id === saved);
        if (found.length && !valid) {
          setProjectId(found[0].id);
        }
      } catch {
        // Handled at screen level
      }

      setReady(true);
    };

    void setup();
  }, [route]);

  const changeProject = (id: number) => {
    setProjectId(id);
    localStorage.setItem("archscale_project_id", String(id));
  };

  if (route === "/login") return <LoginScreen />;
  if (!ready) {
    return (
      <div className="login">
        <Loading text="Initializing ArchScale Nexus workspace…" />
      </div>
    );
  }

  const isAdmin = Boolean(user && (user.role === "admin" || user.is_superadmin));
  const visibleNavGroups = navGroups.filter((group) => !group.adminOnly || isAdmin);

  const renderNav = (closeOnSelect = false) => (
    <nav className="nav">
      {visibleNavGroups.map((group) => (
        <div key={group.title} className="nav-group">
          <div className="nav-title">{group.title}</div>
          {group.links.map(([icon, label, href]) => (
            <Link
              key={href}
              className={`nav-link ${route === href ? "active" : ""}`}
              href={href}
              onClick={() => closeOnSelect && setMobileMenuOpen(false)}
            >
              <span className="nav-link-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">A</span>
          <div>
            ArchScale
            <small>NEXUS</small>
          </div>
        </Link>
        {renderNav()}
        {user && (
          <div className="sidebar-footer">
            <Link
              href="/user"
              className="row between"
              style={{ textDecoration: "none", color: "inherit", width: "100%" }}
              title="Manage your account profile"
            >
              <div className="row" style={{ gap: 8 }}>
                <div className="avatar">
                  {(user.full_name || "U")
                    .split(" ")
                    .map((part: string) => part[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-bright)" }}>
                    {user.full_name}
                  </div>
                  <small style={{ color: "var(--muted)" }}>@{user.username || "user"}</small>
                </div>
              </div>
              <Badge label={user.role} variant="brand" />
            </Link>
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 20 }}>
              <Link href="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
                <span className="brand-mark">A</span>
                <div>
                  ArchScale
                  <small>NEXUS</small>
                </div>
              </Link>
              <button
                className="button small ghost"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            {renderNav(true)}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="main">
        <header className="header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div className="header-title-wrap">
              <h1>Coordination Intelligence Workspace</h1>
            </div>
          </div>

          <div className="header-actions">
            <select
              className="project-picker"
              value={projectId}
              onChange={(e) => changeProject(Number(e.target.value))}
              aria-label="Active project selector"
            >
              {projects.length ? (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              ) : (
                <option value={projectId}>The Lumina Pavilion & Penthouse Residence (#{projectId})</option>
              )}
            </select>

            {user ? (
              <Link className="avatar" href="/user" title={`Account: ${user.full_name} (${user.role})`}>
                {(user.full_name || "U")
                  .split(" ")
                  .map((part: string) => part[0])
                  .slice(0, 2)
                  .join("")}
              </Link>
            ) : (
              <Link className="button small primary" href="/login">
                Sign in
              </Link>
            )}
          </div>
        </header>

        <main className="content">
          <WorkspaceScreen route={route} projectId={projectId} user={user} />
        </main>
      </div>

      <Assistant projectId={projectId} />
    </div>
  );
}
