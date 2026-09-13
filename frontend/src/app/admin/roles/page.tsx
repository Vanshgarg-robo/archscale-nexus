"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { RolePermission } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const ROLE_ICONS: Record<string, string> = {
  admin: "👑", analyst: "📊", operator: "⚙", viewer: "👁",
  project_manager: "📋", architect: "🏗", engineer: "🔧",
  contractor: "🏢", client: "💼", vendor: "📦", site_supervisor: "🦺",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "from-purple-500/15 to-purple-600/5 border-purple-500/25",
  analyst: "from-cyan-500/15 to-cyan-600/5 border-cyan-500/25",
  operator: "from-teal-500/15 to-teal-600/5 border-teal-500/25",
  viewer: "from-slate-500/15 to-slate-600/5 border-slate-500/25",
  project_manager: "from-blue-500/15 to-blue-600/5 border-blue-500/25",
  architect: "from-orange-500/15 to-orange-600/5 border-orange-500/25",
  engineer: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/25",
  contractor: "from-amber-500/15 to-amber-600/5 border-amber-500/25",
  client: "from-pink-500/15 to-pink-600/5 border-pink-500/25",
  vendor: "from-violet-500/15 to-violet-600/5 border-violet-500/25",
  site_supervisor: "from-stone-500/15 to-stone-600/5 border-stone-500/25",
};

export default function RoleManagementPage() {
  const authUser = useAuthStore((s) => s.user);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    if (authUser?.role !== "admin") return;
    api.admin.roles.list()
      .then(setRoles)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="text-orange-400">◇</span> Role Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">{roles.length} roles configured • Permission matrix</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.role}
            className={`bg-gradient-to-br ${ROLE_COLORS[role.role] || "from-slate-500/15 to-slate-600/5 border-slate-500/25"} border rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.01]`}
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedRole(expandedRole === role.role ? null : role.role)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ROLE_ICONS[role.role] || "◈"}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white capitalize">{role.role.replace(/_/g, " ")}</h3>
                    <p className="text-[10px] text-slate-400">{role.permissions.length} permissions • {role.user_count} user{role.user_count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{expandedRole === role.role ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandedRole === role.role && (
              <div className="px-4 pb-4 border-t border-slate-800/50 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map((perm) => (
                    <span key={perm} className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300">
                      {perm.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="text-orange-400">☵</span> Permission Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-3 py-2 font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-[#0B1120] z-10">Permission</th>
                {roles.map((r) => (
                  <th key={r.role} className="text-center px-2 py-2 font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {r.role.replace(/_/g, " ").slice(0, 10)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(roles.flatMap((r) => r.permissions))).sort().map((perm) => (
                <tr key={perm} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                  <td className="px-3 py-1.5 text-slate-300 font-mono whitespace-nowrap sticky left-0 bg-[#0B1120] z-10">{perm.replace(/_/g, " ")}</td>
                  {roles.map((r) => (
                    <td key={r.role} className="text-center px-2 py-1.5">
                      {r.permissions.includes(perm) ? (
                        <span className="text-emerald-400 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
