"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useThemeStore } from "@/store/theme-store";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import { useMobileNavStore } from "@/store/mobile-nav-store";
import { useAuthStore, DEMO_PERSONAS, type DemoPersona } from "@/store/auth-store";

export default function Header() {
  const { isDark, toggle } = useThemeStore();
  const projectId = useProjectStore((s) => s.currentProjectId);
  const toggleMobileNav = useMobileNavStore((s) => s.toggle);
  const { user, setAuth, logout } = useAuthStore();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.notifications.list(projectId).then(setNotifications).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (user?.role === "admin") {
      api.admin.notifications.unreadCount()
        .then((res) => setAdminUnreadCount(res.unread_count))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPersonaMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSwitchPersona = async (persona: DemoPersona) => {
    setSwitching(true);
    try {
      const tokenRes = await api.auth.login({ email: persona.email, password: "password123" });
      if (typeof window !== "undefined") {
        localStorage.setItem("archscale_token", tokenRes.access_token);
      }
      const meRes = await api.auth.me();
      setAuth(tokenRes.access_token, meRes);
    } catch {
      // fallback state update
      if (user) {
        setAuth("mock-token", {
          ...user,
          email: persona.email,
          full_name: persona.name,
          role: persona.role,
        });
      }
    } finally {
      setSwitching(false);
      setShowPersonaMenu(false);
    }
  };

  const currentInitials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AN";

  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "architect":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "project_manager":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "engineer":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "contractor":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "client":
        return "bg-pink-500/15 text-pink-400 border-pink-500/30";
      case "vendor":
        return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <header className="h-16 bg-[#070B14]/90 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30" ref={dropdownRef}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleMobileNav}
          className="md:hidden p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer shrink-0"
          aria-label="Open mobile navigation menu"
        >
          <span className="text-base leading-none block">☰</span>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              The Lumina Pavilion & Penthouse
            </h2>
            <span className="hidden sm:inline-block text-[10px] font-mono font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 rounded">
              SECTOR 42 · GURGAON
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">
            ArchScale Design Studio • AI Coordination Active
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Link to Flagship AI Impact Analysis */}
        <Link
          href="/impact"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold transition-all shadow-sm"
        >
          <span className="text-orange-400">⚡</span>
          <span>AI Impact Engine</span>
        </Link>

        {/* Quick Link to AI Project Manager Chat */}
        <Link
          href="/chat"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
        >
          <span>💬</span>
          <span>AI PM Chat</span>
        </Link>

        {/* Admin Notifications Badge */}
        {user?.role === "admin" && (
          <Link
            href="/admin/notifications"
            title="Admin Notifications"
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 hover:text-white transition-colors text-xs sm:text-sm"
          >
            <span>⬡</span>
            {adminUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-mono rounded-full flex items-center justify-center font-bold animate-pulse">
                {adminUnreadCount}
              </span>
            )}
          </Link>
        )}

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggle}
          title="Toggle theme"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer text-xs sm:text-sm"
        >
          {isDark ? "☀" : "☽"}
        </button>

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowPersonaMenu(false);
            }}
            title="Project Notifications"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer relative text-xs sm:text-sm"
          >
            <span>🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-mono rounded-full flex items-center justify-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 max-w-[90vw] bg-[#0C1222] border border-slate-800 rounded-2xl shadow-2xl p-4 max-h-96 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔔</span> Coordination Alerts
                </h3>
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-orange-400 hover:underline font-mono"
                >
                  View All ({notifications.length})
                </Link>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active alerts</p>
              ) : (
                notifications.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl mb-2 text-xs transition-colors border ${
                      n.is_read
                        ? "text-slate-500 bg-slate-900/40 border-slate-800/50"
                        : "text-slate-300 bg-slate-800/80 border-slate-700/60 shadow-sm"
                    }`}
                  >
                    <p className="font-semibold text-white text-xs">{n.title}</p>
                    <p className="text-slate-400 text-[11px] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 1-Click Role Switcher & User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPersonaMenu(!showPersonaMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold shadow">
              {currentInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {user?.full_name || "Ananya Sharma"}
              </p>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role || "ARCHITECT"}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 ml-0.5">▼</span>
          </button>

          {showPersonaMenu && (
            <div className="absolute right-0 top-12 w-80 bg-[#0C1222] border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="pb-3 border-b border-slate-800/80 px-2 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${getRoleBadgeColor(
                      user?.role
                    )}`}
                  >
                    {user?.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{user?.email}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Org: ArchScale Design Studio</p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between px-2 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    ⚡ Quick Role Switcher
                  </span>
                  <span className="text-[9px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono">
                    Instant RBAC
                  </span>
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {DEMO_PERSONAS.map((p) => {
                    const isCurrent = user?.email === p.email;
                    return (
                      <button
                        key={p.email}
                        onClick={() => handleSwitchPersona(p)}
                        disabled={switching}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-orange-500/15 border border-orange-500/30 text-white"
                            : "hover:bg-slate-800/70 border border-transparent text-slate-300"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.avatarColor} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{p.title}</p>
                        </div>
                        {isCurrent && <span className="text-orange-400 text-xs font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between px-2">
                <Link
                  href="/login"
                  onClick={() => setShowPersonaMenu(false)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Full Sign-In Screen
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setShowPersonaMenu(false);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
