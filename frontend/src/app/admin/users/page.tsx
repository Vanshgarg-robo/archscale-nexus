"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { AdminUser, AdminUserListResponse } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { formatDate, getRelativeTime } from "@/lib/utils";

const ROLES = ["admin", "analyst", "operator", "viewer", "project_manager", "architect", "engineer", "contractor", "client", "vendor", "site_supervisor"];

function getRoleBadgeColor(role: string) {
  const m: Record<string, string> = {
    admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    analyst: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    operator: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    viewer: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    project_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    architect: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    engineer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    contractor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    client: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    vendor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    site_supervisor: "bg-stone-500/15 text-stone-400 border-stone-500/30",
  };
  return m[role] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

export default function UserManagementPage() {
  const authUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", role: "viewer", username: "" });
  const [editForm, setEditForm] = useState({ email: "", full_name: "", role: "", username: "", is_active: true });
  const [resetPassword, setResetPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res: AdminUserListResponse = await api.admin.users.list({
        page, page_size: 20, search: search || undefined, role: roleFilter || undefined,
        status: statusFilter || undefined, sort_by: sortBy, sort_order: sortOrder,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch { }
    setLoading(false);
  }, [page, search, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    setFormError(null);
    setActionLoading(true);
    try {
      await api.admin.users.create(createForm);
      setShowCreate(false);
      setCreateForm({ email: "", password: "", full_name: "", role: "viewer", username: "" });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    }
    setActionLoading(false);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setFormError(null);
    setActionLoading(true);
    try {
      await api.admin.users.update(editUser.id, editForm);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.admin.users.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchUsers();
    } catch { }
    setActionLoading(false);
  };

  const handleToggleStatus = async (u: AdminUser) => {
    try {
      await api.admin.users.toggleStatus(u.id);
      fetchUsers();
    } catch { }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return;
    setActionLoading(true);
    try {
      await api.admin.users.resetPassword(resetTarget.id, resetPassword);
      setResetTarget(null);
      setResetPassword("");
    } catch { }
    setActionLoading(false);
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditForm({ email: u.email, full_name: u.full_name, role: u.role, username: u.username || "", is_active: u.is_active });
    setFormError(null);
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
    setPage(1);
  };

  if (authUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">⊘</div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Access Denied</h3>
        <p className="text-xs text-slate-500">Administrator privileges required.</p>
      </div>
    );
  }

  const SortIcon = ({ col }: { col: string }) => (
    <span className="text-[9px] ml-0.5 text-slate-600">{sortBy === col ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-orange-400">◉</span> User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">{total} total users • Organization-scoped</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFormError(null); }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
        >
          + Create User
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users by name, email, or username..."
            className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        {loading ? <LoadingSpinner /> : users.length === 0 ? (
          <EmptyState icon="◉" title="No Users Found" message="No users match the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => toggleSort("full_name")}>
                    User <SortIcon col="full_name" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => toggleSort("role")}>
                    Role <SortIcon col="role" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => toggleSort("is_active")}>
                    Status <SortIcon col="is_active" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:text-white" onClick={() => toggleSort("last_login_at")}>
                    Last Login <SortIcon col="last_login_at" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-white" onClick={() => toggleSort("created_at")}>
                    Created <SortIcon col="created_at" />
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {u.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{u.full_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${getRoleBadgeColor(u.role)}`}>
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${u.is_active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 hidden lg:table-cell">
                      {u.last_login_at ? getRelativeTime(u.last_login_at) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 hidden md:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} title="Edit" className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white text-[10px] transition-colors cursor-pointer">✎</button>
                        <button onClick={() => handleToggleStatus(u)} title={u.is_active ? "Disable" : "Enable"} className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white text-[10px] transition-colors cursor-pointer">{u.is_active ? "⊘" : "◈"}</button>
                        <button onClick={() => { setResetTarget(u); setResetPassword(""); }} title="Reset Password" className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white text-[10px] transition-colors cursor-pointer">🔑</button>
                        <button onClick={() => setDeleteTarget(u)} title="Delete" className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 text-[10px] transition-colors cursor-pointer">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">Page {page} of {totalPages} • {total} total users</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 disabled:opacity-30 cursor-pointer transition-colors">←</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 disabled:opacity-30 cursor-pointer transition-colors">→</button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="md">
        {formError && <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">⚠ {formError}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
            <input type="text" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email</label>
            <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all" placeholder="user@company.com" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Username</label>
            <input type="text" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all" placeholder="johndoe" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Password</label>
            <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Role</label>
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer">
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <button onClick={handleCreate} disabled={actionLoading || !createForm.email || !createForm.password || !createForm.full_name} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer mt-2">
            {actionLoading ? "Creating..." : "Create User"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={`Edit User: ${editUser?.full_name || ""}`} size="md">
        {formError && <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">⚠ {formError}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
            <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Username</label>
            <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer">
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <button onClick={handleEdit} disabled={actionLoading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer mt-2">
            {actionLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password: ${resetTarget?.full_name || ""}`} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">New Password</label>
            <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all" placeholder="Min 8 characters" />
          </div>
          <button onClick={handleResetPassword} disabled={actionLoading || resetPassword.length < 8} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer">
            {actionLoading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${deleteTarget?.full_name}? This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
