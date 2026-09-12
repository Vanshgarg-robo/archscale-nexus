"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Dependency, Task } from "@/types";

export default function DependenciesPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [downstreamChain, setDownstreamChain] = useState<any[]>([]);
  const [criticalPath, setCriticalPath] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainLoading, setChainLoading] = useState(false);
  const [newSourceId, setNewSourceId] = useState<number | "">("");
  const [newTargetId, setNewTargetId] = useState<number | "">("");
  const [newRelType, setNewRelType] = useState("depends_on");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.dependencies.list(projectId),
      api.tasks.list(projectId),
      api.dependencies.criticalPath(projectId).catch(() => []),
    ])
      .then(([deps, taskList, cp]) => {
        setDependencies(deps);
        setTasks(taskList);
        setCriticalPath(cp);
        if (taskList.length > 0) {
          setSelectedTaskId(taskList[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!selectedTaskId) return;
    setChainLoading(true);
    api.dependencies
      .downstream(selectedTaskId)
      .then((chain) => {
        setDownstreamChain(chain);
        setChainLoading(false);
      })
      .catch(() => {
        setDownstreamChain([]);
        setChainLoading(false);
      });
  }, [selectedTaskId]);

  const handleCreateDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceId || !newTargetId || newSourceId === newTargetId) return;
    setCreating(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: Number(newSourceId),
          target_id: Number(newTargetId),
          relationship_type: newRelType,
        }),
      });
      const updatedDeps = await api.dependencies.list(projectId);
      setDependencies(updatedDeps);
      setNewSourceId("");
      setNewTargetId("");
    } catch {
    }
    setCreating(false);
  };

  if (loading) return <LoadingSpinner />;

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dependency Intelligence</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Downstream impact chains, critical path detection, and dependency risk propagation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            {dependencies.length} Total Links
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {criticalPath.length} Critical Chain Tasks
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span>Project Tasks</span>
              <span className="text-xs text-slate-500 font-normal">Select to inspect chain</span>
            </h2>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                const isCritical = criticalPath.some((cp) => cp.id === task.id || cp.title === task.title);
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-orange-500/10 border-orange-500/40 shadow-sm shadow-orange-500/10"
                        : "bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold line-clamp-1 ${isSelected ? "text-orange-400" : "text-white"}`}>
                        {task.title}
                      </p>
                      {isCritical && (
                        <span className="shrink-0 text-[10px] uppercase font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>{task.assignee_name || "Unassigned"}</span>
                      <StatusBadge status={task.status} size="sm" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Add Relationship Link</h2>
            <form onSubmit={handleCreateDependency} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Source Task (Prerequisite)</label>
                <select
                  value={newSourceId}
                  onChange={(e) => setNewSourceId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select source task...</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Relationship</label>
                <select
                  value={newRelType}
                  onChange={(e) => setNewRelType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="depends_on">depends_on (Target depends on Source)</option>
                  <option value="blocks">blocks (Source blocks Target)</option>
                  <option value="requires_approval">requires_approval</option>
                  <option value="affected_by">affected_by</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Task (Dependent)</label>
                <select
                  value={newTargetId}
                  onChange={(e) => setNewTargetId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select target task...</option>
                  {tasks.filter((t) => t.id !== newSourceId).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creating || !newSourceId || !newTargetId}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {creating ? "Linking..." : "Establish Dependency"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 text-base">⧫</span>
                  <h2 className="text-base font-semibold text-white">
                    Downstream Blast Radius & Chain
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active Origin: <span className="text-white font-medium">{selectedTask?.title || "None Selected"}</span>
                </p>
              </div>
              {selectedTask && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Progress</span>
                  <span className="text-sm font-bold text-white">{selectedTask.progress}%</span>
                </div>
              )}
            </div>

            <div className="mt-5">
              {chainLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : downstreamChain.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/20 rounded-xl border border-dashed border-slate-800">
                  <p className="text-sm text-slate-400">
                    No downstream dependent tasks found for this item.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Changes to this task will not delay downstream construction sequences.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                    ⚠️ Any schedule delay or design modification on this task propagates to{" "}
                    <strong>{downstreamChain.length}</strong> downstream task(s).
                  </div>
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-orange-500 before:via-slate-700 before:to-transparent">
                    {downstreamChain.map((node, index) => (
                      <div
                        key={node.id || index}
                        className="relative bg-slate-800/40 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
                      >
                        <span className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-slate-900 border-2 border-orange-500 flex items-center justify-center text-[9px] font-bold text-orange-400">
                          {index + 1}
                        </span>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{node.title || node.target_task_title}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Relationship: <code className="text-orange-300 font-mono text-[11px]">{node.relationship_type || "depends_on"}</code>
                            </p>
                          </div>
                          <div className="text-right">
                            {node.status && <StatusBadge status={node.status} size="sm" />}
                            {node.estimated_days && (
                              <p className="text-[11px] text-slate-500 mt-1">{node.estimated_days} days work</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-red-400">🔥</span> Critical Path Sequence
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Tasks on the zero-float critical path that directly govern project completion:
            </p>
            {criticalPath.length === 0 ? (
              <p className="text-xs text-slate-500">Calculating critical path sequence...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {criticalPath.map((item, idx) => (
                  <div key={item.id || idx} className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Step {idx + 1}</span>
                      <span className="text-red-400 font-semibold">{item.estimated_days || 7}d</span>
                    </div>
                    <p className="text-xs font-semibold text-white line-clamp-1">{item.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{item.assignee_name || "Assigned Lead"}</span>
                      <StatusBadge status={item.status || "in_progress"} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
