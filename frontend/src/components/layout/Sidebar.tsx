"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMobileNavStore } from "@/store/mobile-nav-store";
import { useAuthStore } from "@/store/auth-store";

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: string;
    isFlagship?: boolean;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Executive Command", icon: "⬡" },
    ],
  },
  {
    title: "Intelligence Engines",
    items: [
      { href: "/impact", label: "AI Impact Engine", icon: "⚡", isFlagship: true, badge: "FLAGSHIP" },
      { href: "/chat", label: "AI Project Manager", icon: "💬", badge: "AI" },
      { href: "/knowledge-graph", label: "Knowledge Graph", icon: "◈" },
      { href: "/dependencies", label: "Dependencies", icon: "⧫" },
      { href: "/stakeholders", label: "Stakeholders", icon: "◉" },
      { href: "/communications", label: "Communications", icon: "◎" },
      { href: "/change-requests", label: "Change Requests", icon: "⟐" },
    ],
  },
  {
    title: "Governance & Blocker Radar",
    items: [
      { href: "/approvals", label: "Approvals", icon: "◇" },
      { href: "/blockers", label: "Blocker Detection", icon: "⊘" },
      { href: "/risks", label: "Risk Intelligence", icon: "△" },
      { href: "/alerts", label: "Coordination Alerts", icon: "⌁" },
    ],
  },
  {
    title: "Simulation & Memory",
    items: [
      { href: "/simulator", label: "What-If Simulator", icon: "⟡" },
      { href: "/memory", label: "Project Memory", icon: "◐" },
      { href: "/summaries", label: "AI Summaries", icon: "☵" },
    ],
  },
];

const adminNavSection: NavSection = {
  title: "Administration",
  items: [
    { href: "/admin", label: "Admin Dashboard", icon: "⬡" },
    { href: "/admin/users", label: "User Management", icon: "◉" },
    { href: "/admin/roles", label: "Role Management", icon: "◇" },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: "☵" },
    { href: "/admin/notifications", label: "Notifications", icon: "🔔" },
    { href: "/admin/monitoring", label: "System Monitor", icon: "◐" },
    { href: "/admin/settings", label: "Settings", icon: "⚙" },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, close } = useMobileNavStore();
  const user = useAuthStore((s) => s.user);

  const handleNavClick = () => {
    if (isOpen) close();
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-[#070B14] border-r border-slate-800/80 z-50 transition-all duration-300 flex flex-col ${
          isOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-16" : "md:w-64"}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 gap-3">
          <Link href="/" onClick={handleNavClick} className="flex items-center gap-3 overflow-hidden group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              AN
            </div>
            {(!collapsed || isOpen) && (
              <div className="overflow-hidden min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight truncate">
                  ArchScale <span className="text-orange-400">Nexus</span>
                </h1>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Coordination OS</p>
              </div>
            )}
          </Link>
          <button
            onClick={close}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-4 custom-scrollbar">
          {[...navSections, ...(user?.role === "admin" ? [adminNavSection] : [])].map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {(!collapsed || isOpen) && (
                <p className="px-4 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 mx-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-300 border border-orange-500/40 font-semibold shadow-sm"
                        : item.isFlagship
                        ? "text-orange-300/90 hover:text-orange-200 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-sm shrink-0 transition-transform group-hover:scale-110 ${
                        isActive
                          ? "text-orange-400"
                          : item.isFlagship
                          ? "text-orange-400"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {(!collapsed || isOpen) && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              item.isFlagship
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse Button */}
        <div className="hidden md:block p-3 border-t border-slate-800/80">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{collapsed ? "→" : "←"}</span>
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Quick Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#070B14]/95 backdrop-blur-md border-t border-slate-800 z-30 flex items-center justify-around px-2">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${pathname === "/" ? "text-orange-400 font-bold" : "text-slate-400"}`}
        >
          <span className="text-base">⬡</span>
          <span>Command</span>
        </Link>
        <Link
          href="/impact"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${pathname === "/impact" ? "text-orange-400 font-bold" : "text-slate-400"}`}
        >
          <span className="text-base">⚡</span>
          <span>Impact</span>
        </Link>
        <Link
          href="/chat"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${pathname === "/chat" ? "text-orange-400 font-bold" : "text-slate-400"}`}
        >
          <span className="text-base">💬</span>
          <span>AI PM</span>
        </Link>
        <Link
          href="/approvals"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${pathname === "/approvals" ? "text-orange-400 font-bold" : "text-slate-400"}`}
        >
          <span className="text-base">◇</span>
          <span>Approvals</span>
        </Link>
        <Link
          href="/knowledge-graph"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${pathname === "/knowledge-graph" ? "text-orange-400 font-bold" : "text-slate-400"}`}
        >
          <span className="text-base">◈</span>
          <span>Graph</span>
        </Link>
      </div>
    </>
  );
}
