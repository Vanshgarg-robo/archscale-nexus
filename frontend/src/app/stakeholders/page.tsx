"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getRoleLabel } from "@/lib/utils";

export default function StakeholdersPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedStakeholder, setSelectedStakeholder] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.stakeholders.matrix(projectId), api.stakeholders.workloads(projectId)])
      .then(([m, w]) => {
        setMatrix(m);
        setWorkloads(w);
        if (m.length > 0) setSelectedStakeholder(m[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <LoadingSpinner />;

  const filteredMatrix = roleFilter === "all"
    ? matrix
    : matrix.filter((m) => m.stakeholder.role.toLowerCase() === roleFilter.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Stakeholder Intelligence</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Maintain organizational roles, cross-functional responsibilities, influence scoring, and workload balance
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "architect", "client", "contractor", "electrical_engineer", "interior_designer", "vendor"].map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                roleFilter === rf
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                  : "text-slate-400 bg-slate-800/60 border border-slate-800 hover:text-white"
              }`}
            >
              {rf === "all" ? "All Roles" : rf.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Stakeholder Matrix ({filteredMatrix.length})</h3>
              <span className="text-xs text-slate-400">Click a card for deep profile</span>
            </div>

            <div className="space-y-3">
              {filteredMatrix.map((m) => {
                const s = m.stakeholder;
                const isSelected = selectedStakeholder?.stakeholder.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStakeholder(m)}
                    className={`bg-slate-800/30 border rounded-xl p-4 cursor-pointer transition-all flex flex-col md:flex-row md:items-center gap-4 ${
                      isSelected
                        ? "border-orange-500/50 bg-slate-800/60 ring-1 ring-orange-500/30"
                        : "border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/80 to-amber-600/80 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-md">
                      {s.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white font-bold">{s.name}</p>
                        <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded font-mono uppercase">
                          {getRoleLabel(s.role)}
                        </span>
                        {s.title && <span className="text-xs text-slate-400 font-medium">· {s.title}</span>}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>✉ {s.email}</span>
                        {s.phone && <span>☎ {s.phone}</span>}
                      </div>

                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                        <span className="text-slate-500 font-medium">Areas:</span> {m.responsibility_areas || "General Project Coordination"}
                      </p>

                      <div className="flex items-center gap-4 mt-2.5 text-[11px]">
                        <span className="text-blue-400 font-medium">{m.assigned_tasks_count} Assigned Tasks</span>
                        <span className="text-amber-400 font-medium">{m.pending_approvals_count} Approvals Required</span>
                        <span className="text-red-400 font-medium">{m.active_risks_count} Active Risks</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 border-t md:border-t-0 md:border-l border-slate-800/80 pt-2 md:pt-0 md:pl-4">
                      <p className="text-2xl font-extrabold text-orange-400">{Math.round(s.influence_score)}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Influence Score</p>
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full mt-2 ml-auto overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${s.influence_score}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedStakeholder && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Stakeholder Profile</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-lg mb-2">
                  {selectedStakeholder.stakeholder.name.charAt(0)}
                </div>
                <h4 className="text-base font-bold text-white">{selectedStakeholder.stakeholder.name}</h4>
                <p className="text-xs text-orange-400">{getRoleLabel(selectedStakeholder.stakeholder.role)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedStakeholder.stakeholder.title}</p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white font-mono">{selectedStakeholder.stakeholder.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-white font-mono">{selectedStakeholder.stakeholder.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Influence</span>
                  <span className="text-orange-400 font-bold">{Math.round(selectedStakeholder.stakeholder.influence_score)} / 100</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Workload</span>
                  <span className="text-amber-400 font-bold">{Math.round(selectedStakeholder.stakeholder.workload_score)} / 100</span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-1.5">
                  Responsibility Areas
                </p>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {selectedStakeholder.responsibility_areas || "General Project Oversight"}
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Workload Distribution</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {workloads.map((w) => (
                <div key={w.stakeholder_id} className="bg-slate-800/30 border border-slate-800/60 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-xs text-white font-semibold">{w.name}</p>
                      <p className="text-[10px] text-slate-400">{getRoleLabel(w.role)}</p>
                    </div>
                    <span className={`text-sm font-bold font-mono ${
                      w.workload_score > 70 ? "text-red-400" : w.workload_score > 40 ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {Math.round(w.workload_score)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        w.workload_score > 70 ? "bg-red-400" : w.workload_score > 40 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${w.workload_score}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                    <span>Tasks: {w.total_tasks}</span>
                    <span>Done: {w.completed_tasks}</span>
                    {w.overdue_tasks > 0 && <span className="text-red-400 font-bold">Overdue: {w.overdue_tasks}</span>}
                    <span>Approvals: {w.pending_approvals}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
