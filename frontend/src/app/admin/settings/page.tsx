"use client";
import { useAuthStore } from "@/store/auth-store";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function AdminSettingsPage() {
  const authUser = useAuthStore((s) => s.user);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authUser?.role !== "admin") return;
    api.admin.systemHealth()
      .then(setHealth)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser]);

  if (authUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⊘</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Access Denied</h3>
        <p className="text-xs text-slate-500">Administrator privileges required.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  const configItems = [
    { label: "JWT Algorithm", value: "HS256", category: "Authentication" },
    { label: "Access Token TTL", value: "15 minutes", category: "Authentication" },
    { label: "Refresh Token TTL", value: "7 days", category: "Authentication" },
    { label: "Password Hashing", value: "bcrypt", category: "Authentication" },
    { label: "Database Driver", value: "asyncpg (PostgreSQL)", category: "Database" },
    { label: "Connection Pooling", value: "pool_size=20, overflow=10", category: "Database" },
    { label: "Database Status", value: health?.database_connected ? "Connected" : "Disconnected", category: "Database" },
    { label: "Response Time", value: `${health?.database_response_ms || 0}ms`, category: "Database" },
    { label: "API Framework", value: "FastAPI v0.115", category: "System" },
    { label: "Runtime", value: "Python 3.12 + Uvicorn", category: "System" },
    { label: "Frontend", value: "Next.js 16 + React 19", category: "System" },
    { label: "AI Engine", value: "Gemini 2.5 Flash", category: "System" },
    { label: "CORS Origins", value: "localhost:3000, vercel.app", category: "Security" },
    { label: "RBAC", value: "11 roles, permission-based", category: "Security" },
    { label: "Rate Limiting", value: "Enabled (global)", category: "Security" },
    { label: "CSRF Protection", value: "Bearer token auth", category: "Security" },
  ];

  const categories = Array.from(new Set(configItems.map((c) => c.category)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="text-orange-400">⚙</span> System Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Platform configuration • Read-only system information</p>
      </div>

      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="text-orange-400">◈</span> Organization
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Organization</p>
            <p className="text-sm font-bold text-white mt-1">{authUser?.organization_name || "ArchScale Design Studio"}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Admin User</p>
            <p className="text-sm font-bold text-white mt-1">{authUser?.full_name}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Admin Email</p>
            <p className="text-sm font-bold text-white mt-1">{authUser?.email}</p>
          </div>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category} className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="text-orange-400">◈</span> {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {configItems
              .filter((c) => c.category === category)
              .map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-slate-900/40 border border-slate-800/40 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
                  <span className="text-[11px] font-mono text-white font-semibold">{item.value}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
