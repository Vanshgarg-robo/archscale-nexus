"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import { formatDate, getRelativeTime } from "@/lib/utils";
import Modal from "@/components/shared/Modal";

function getRoleTheme(role: string = "viewer") {
  const r = role.toLowerCase();
  switch (r) {
    case "admin":
      return {
        badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        glow: "from-purple-500/20 to-indigo-600/10",
        border: "border-purple-500/30",
        accent: "text-purple-400",
        icon: "⚡",
        title: "System Administrator",
      };
    case "analyst":
      return {
        badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        glow: "from-cyan-500/20 to-blue-600/10",
        border: "border-cyan-500/30",
        accent: "text-cyan-400",
        icon: "◈",
        title: "Radar Intelligence Analyst",
      };
    case "operator":
      return {
        badge: "bg-teal-500/15 text-teal-400 border-teal-500/30",
        glow: "from-teal-500/20 to-emerald-600/10",
        border: "border-teal-500/30",
        accent: "text-teal-400",
        icon: "◉",
        title: "Radar Operations Specialist",
      };
    case "viewer":
      return {
        badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
        glow: "from-slate-500/20 to-zinc-600/10",
        border: "border-slate-500/30",
        accent: "text-slate-400",
        icon: "◎",
        title: "Executive Observer / Viewer",
      };
    case "project_manager":
      return {
        badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        glow: "from-blue-500/20 to-cyan-600/10",
        border: "border-blue-500/30",
        accent: "text-blue-400",
        icon: "✦",
        title: "Project Director",
      };
    case "architect":
      return {
        badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        glow: "from-orange-500/20 to-amber-600/10",
        border: "border-orange-500/30",
        accent: "text-orange-400",
        icon: "⬡",
        title: "Principal Architect",
      };
    case "engineer":
      return {
        badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        glow: "from-emerald-500/20 to-teal-600/10",
        border: "border-emerald-500/30",
        accent: "text-emerald-400",
        icon: "⚙",
        title: "Lead Systems Engineer",
      };
    default:
      return {
        badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
        glow: "from-slate-500/20 to-zinc-600/10",
        border: "border-slate-500/30",
        accent: "text-slate-400",
        icon: "●",
        title: "Team Member",
      };
  }
}

export default function UserProfilePage() {
  const router = useRouter();
  const { user, token, setAuth, logout } = useAuthStore();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Profile modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    mobile_no: "",
    avatar_url: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Change Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "capabilities" | "security">("overview");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, permRes] = await Promise.all([
        api.auth.me().catch(() => null),
        api.auth.permissions().catch(() => null),
      ]);
      if (meRes && token) {
        setAuth(token, meRes);
        setEditForm({
          full_name: meRes.full_name || "",
          username: meRes.username || "",
          mobile_no: meRes.mobile_no || "",
          avatar_url: meRes.avatar_url || "",
        });
      }
      if (permRes?.permissions) {
        setPermissions(permRes.permissions);
      }
    } catch {
      // Fallback to local store user
    } finally {
      setLoading(false);
    }
  }, [token, setAuth]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || "",
        username: user.username || "",
        mobile_no: user.mobile_no || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user]);

  const copyToClipboard = (text: string, field: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      const updated = await api.auth.updateProfile({
        full_name: editForm.full_name,
        username: editForm.username || undefined,
        mobile_no: editForm.mobile_no || undefined,
        avatar_url: editForm.avatar_url || undefined,
      });

      if (token) {
        setAuth(token, updated);
      }
      setEditSuccess(true);
      setTimeout(() => {
        setShowEdit(false);
        setEditSuccess(false);
      }, 1200);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update profile details.");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match.");
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      setPasswordLoading(false);
      return;
    }

    try {
      await api.auth.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setPasswordSuccess(true);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err?.message || "Incorrect current password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const theme = getRoleTheme(user?.role);
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "US";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">User Portal</span>
          <span>/</span>
          <span className="text-orange-400 font-mono">@{user?.username || "identity"}</span>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span>⚡</span> Admin Console
            </Link>
          )}
          <button
            onClick={() => setShowEdit(true)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>✎</span> Edit Profile
          </button>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>🔑</span> Change Password
          </button>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0B1120]/95 via-[#0E1626]/90 to-[#070B14] border border-slate-800/80 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${theme.glow} rounded-full blur-3xl pointer-events-none`} />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar with dynamic ring */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 flex items-center justify-center text-white text-2xl font-black shadow-xl tracking-wider">
                {initials}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0B1120] flex items-center justify-center text-[10px] text-white shadow-lg"
                title="Active Account Status"
              >
                ✓
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight">{user?.full_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${theme.badge}`}>
                  {theme.icon} {user?.role}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Operator
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 font-mono flex-wrap">
                <span className="text-orange-400 font-semibold">@{user?.username || "no-username"}</span>
                <span>•</span>
                <span>{user?.email}</span>
                <span>•</span>
                <span className="text-slate-300">{user?.mobile_no || "Mobile not set"}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics / Status */}
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-xl self-stretch md:self-auto justify-around">
            <div className="text-center px-3">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">Security Tier</span>
              <span className="text-sm font-bold text-white uppercase">{user?.role === "admin" ? "Level 4 (Full)" : "Level 2 (Active)"}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-3">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">Capabilities</span>
              <span className="text-sm font-bold text-cyan-400">{permissions.length || 8} Access Grants</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-3">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">Organization</span>
              <span className="text-sm font-bold text-slate-300 truncate max-w-[120px] inline-block">{user?.organization_name || "ArchScale Studio"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          👤 Identity Coordinates
        </button>
        <button
          onClick={() => setActiveTab("capabilities")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "capabilities"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          🛡 Role Capabilities & Grants
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          🔒 Security & Sessions
        </button>
      </div>

      {/* TAB 1: Identity Coordinates */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main User Coordinates List */}
          <div className="lg:col-span-2 bg-[#0B1120]/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-orange-400">◈</span> Registered Identity Profile
              </h2>
              <span className="text-[11px] text-slate-500">Synced with ArchScale Realtime Database</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Username</span>
                  <button
                    onClick={() => copyToClipboard(user?.username || "", "username")}
                    className="text-[10px] text-slate-500 hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    {copiedField === "username" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-sm font-bold text-orange-400 font-mono">@{user?.username || "not-configured"}</div>
                <span className="text-[10px] text-slate-500 mt-1 block">Used for primary system authentication</span>
              </div>

              {/* Full Name */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Full Name</span>
                  <button
                    onClick={() => copyToClipboard(user?.full_name || "", "full_name")}
                    className="text-[10px] text-slate-500 hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    {copiedField === "full_name" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-sm font-bold text-white">{user?.full_name}</div>
                <span className="text-[10px] text-slate-500 mt-1 block">Legal and organizational display identity</span>
              </div>

              {/* Email Address */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Work Email</span>
                  <button
                    onClick={() => copyToClipboard(user?.email || "", "email")}
                    className="text-[10px] text-slate-500 hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    {copiedField === "email" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-sm font-bold text-white font-mono truncate">{user?.email}</div>
                <span className="text-[10px] text-slate-500 mt-1 block">Verified contact & dispatch address</span>
              </div>

              {/* Mobile Number */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mobile Number</span>
                  <button
                    onClick={() => copyToClipboard(user?.mobile_no || "", "mobile_no")}
                    className="text-[10px] text-slate-500 hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    {copiedField === "mobile_no" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-sm font-bold text-cyan-400 font-mono">{user?.mobile_no || "+1 (555) 000-0000"}</div>
                <span className="text-[10px] text-slate-500 mt-1 block">SMS notifications & telemetric alerts</span>
              </div>

              {/* User ID */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">User Identifier</span>
                <div className="text-sm font-bold text-slate-300 font-mono">UID-{String(user?.id).padStart(5, "0")}</div>
                <span className="text-[10px] text-slate-500 mt-1 block">Database primary entity key</span>
              </div>

              {/* Organization */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Affiliated Studio</span>
                <div className="text-sm font-bold text-white">{user?.organization_name || "ArchScale Design Studio"}</div>
                <span className="text-[10px] text-slate-500 mt-1 block">Enterprise Workspace Org #{user?.organization_id}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowEdit(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>✎</span> Update Profile Data
              </button>
            </div>
          </div>

          {/* Side Shortcuts & Role Banner */}
          <div className="space-y-6">
            <div className="bg-[#0B1120]/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-cyan-400">◉</span> Role Mission
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As a registered <strong className="text-white font-semibold">{theme.title}</strong>, your account is authorized to interact with platform radar nodes, intelligence pipelines, and operational controls.
              </p>

              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Quick Portals</span>
                {user?.role === "admin" && (
                  <Link
                    href="/admin/users"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 text-xs font-medium text-slate-300 hover:text-white transition-all"
                  >
                    <span>User Directory & RBAC</span>
                    <span className="text-purple-400 font-mono">→</span>
                  </Link>
                )}
                <Link
                  href="/simulator"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 text-xs font-medium text-slate-300 hover:text-white transition-all"
                >
                  <span>Impact Simulator</span>
                  <span className="text-orange-400 font-mono">→</span>
                </Link>
                <Link
                  href="/alerts"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-300 hover:text-white transition-all"
                >
                  <span>Radar Signals & Alerts</span>
                  <span className="text-cyan-400 font-mono">→</span>
                </Link>
              </div>
            </div>

            {/* Logout panel */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-400 block">Sign Out Session</span>
                <span className="text-[10px] text-slate-500">Invalidate local JWT token</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Capabilities & Grants */}
      {activeTab === "capabilities" && (
        <div className="bg-[#0B1120]/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-cyan-400">🛡</span> Access Control & Permissions Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Permissions actively assigned to your role ({user?.role})</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${theme.badge}`}>
              {user?.role}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions.map((perm) => (
              <div
                key={perm}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-mono font-semibold text-white truncate block">{perm}</span>
                  <span className="text-[10px] text-slate-500 block">Granted by security policy</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Security & Sessions */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0B1120]/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">🔑</span> Authentication & Passwords
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your account is protected with cryptographic bcrypt hashing. You can update your password at any time.
            </p>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>🔑</span> Update Password
            </button>
          </div>

          <div className="bg-[#0B1120]/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-emerald-400">◉</span> Active Session
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Device Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online (Current)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">JWT Token</span>
                <span className="text-slate-300 font-mono text-[11px]">Valid • HS256 Signed</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Transport Security</span>
                <span className="text-slate-300 font-mono text-[11px]">TLS Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit User Identity Coordinates" size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {editError}
            </div>
          )}
          {editSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              ✓ Profile identity updated successfully!
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Full Legal Name
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Username (@handle)
            </label>
            <input
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-orange-400 font-mono placeholder-slate-500 focus:outline-none focus:border-orange-500"
              placeholder="e.g. johndoe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Mobile Number
            </label>
            <input
              type="text"
              value={editForm.mobile_no}
              onChange={(e) => setEditForm({ ...editForm, mobile_no: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-cyan-400 font-mono placeholder-slate-500 focus:outline-none focus:border-orange-500"
              placeholder="e.g. +1 (555) 234-5678"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Avatar Image URL
            </label>
            <input
              type="url"
              value={editForm.avatar_url}
              onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              placeholder="https://..."
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
            >
              {editLoading ? "Saving..." : "Save Coordinates"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Account Password" size="sm">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              ✓ Password updated successfully!
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              New Password (min 8 chars)
            </label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              required
              minLength={8}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
