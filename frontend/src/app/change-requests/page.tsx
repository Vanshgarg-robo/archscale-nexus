"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { formatDate, getSeverityIcon } from "@/lib/utils";

interface ChangePreset {
  title: string;
  description: string;
  reason: string;
  task_ids: number[];
}

const PRESET_CHANGES: ChangePreset[] = [
  {
    title: "Move kitchen island",
    description: "Shift island location 1.2m towards external patio window to create 8-seater breakfast bar.",
    reason: "Client design aesthetic preference and open-plan spatial flow enhancement.",
    task_ids: [4, 6],
  },
  {
    title: "Change flooring material",
    description: "Replace engineered oak plank flooring with large-format imported Calacatta Gold marble slabs.",
    reason: "Luxury finish upgrade requested by interior designer and client.",
    task_ids: [6, 12],
  },
  {
    title: "Update lighting plan",
    description: "Incorporate indirect cove LED linear lighting and Lutron architectural keypad scene controllers.",
    reason: "Smart lighting integration requirement.",
    task_ids: [4, 10],
  },
];

export default function ChangeRequestsPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [crs, setCrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCr, setSelectedCr] = useState<any>(null);
  const [impactResult, setImpactResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formReason, setFormReason] = useState("");

  const loadData = async () => {
    try {
      const d = await api.changeRequests.list(projectId);
      setCrs(d);
      if (d.length > 0 && !selectedCr) {
        analyzeImpact(d[0]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [projectId]);

  const analyzeImpact = async (cr: any) => {
    setSelectedCr(cr);
    const taskIds = cr.affected_areas?.task_ids || [4];
    try {
      const result = await api.impact.analyze({
        project_id: projectId,
        change_description: cr.title,
        affected_task_ids: taskIds,
      });
      setImpactResult(result);
    } catch {
      setImpactResult(null);
    }
  };

  const applyPreset = (preset: ChangePreset) => {
    setFormTitle(preset.title);
    setFormDesc(preset.description);
    setFormReason(preset.reason);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await api.changeRequests.create({
        project_id: projectId,
        owner_id: 1,
        title: formTitle,
        description: formDesc,
        reason: formReason,
        affected_areas: { task_ids: [4, 6] },
      });
      setFormTitle("");
      setFormDesc("");
      setFormReason("");
      setIsModalOpen(false);
      await loadData();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (crId: number, nextStatus: string) => {
    try {
      await api.changeRequests.updateStatus(crId, { status: nextStatus });
      await loadData();
    } catch {
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Change Request System</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Submit modifications, evaluate multi-stakeholder impact chains, and manage approval status lifecycles
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-orange-500/10"
        >
          <span>+</span>
          <span>Submit Change Request</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Active Change Requests ({crs.length})</h3>
            <span className="text-xs text-slate-400">Click to inspect downstream impact</span>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
            {crs.map((cr) => (
              <div
                key={cr.id}
                onClick={() => analyzeImpact(cr)}
                className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition-all ${
                  selectedCr?.id === cr.id
                    ? "border-orange-500/50 bg-slate-900 ring-1 ring-orange-500/30"
                    : "border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{cr.title}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cr.description}</p>
                    {cr.reason && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        <span className="text-slate-400 not-italic font-medium">Reason:</span> {cr.reason}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={cr.status} size="md" />
                </div>

                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                  {cr.risk_level && (
                    <span className="flex items-center gap-1">
                      {getSeverityIcon(cr.risk_level)}
                      <span className="capitalize">{cr.risk_level} Risk</span>
                    </span>
                  )}
                  {cr.estimated_delay_days !== null && cr.estimated_delay_days !== undefined && (
                    <span className="text-amber-400 font-mono">+{cr.estimated_delay_days}d delay</span>
                  )}
                  <span className="ml-auto text-slate-500">{formatDate(cr.created_at)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Lifecycle Actions:</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {cr.status === "proposed" && (
                      <button
                        onClick={() => handleStatusTransition(cr.id, "under_review")}
                        className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        Send to Review
                      </button>
                    )}
                    {cr.status === "under_review" && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(cr.id, "approved")}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusTransition(cr.id, "rejected")}
                          className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {cr.status === "approved" && (
                      <button
                        onClick={() => handleStatusTransition(cr.id, "implemented")}
                        className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        Mark Implemented
                      </button>
                    )}
                    {cr.status === "implemented" && (
                      <span className="text-[10px] text-emerald-400 font-mono">✓ Fully Implemented</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-semibold text-white">Impact Analysis Engine</h3>
              {selectedCr && <p className="text-xs text-orange-400 mt-0.5 truncate">{selectedCr.title}</p>}
            </div>
            {selectedCr && <StatusBadge status={selectedCr.status} />}
          </div>

          {!selectedCr ? (
            <div className="text-center py-24 text-slate-500 text-sm">
              <p className="text-3xl mb-2 text-slate-700">⟐</p>
              <p>Select a change request to view real-time blast radius</p>
            </div>
          ) : !impactResult ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-orange-400">{impactResult.affected_tasks?.length || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tasks Affected</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-blue-400">{impactResult.affected_stakeholders?.length || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Stakeholders</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-400">+{impactResult.estimated_delay_days || 0}d</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Est. Delay</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  Affected Stakeholders & Responsibilities
                </p>
                <div className="space-y-1.5">
                  {impactResult.affected_stakeholders?.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs bg-slate-800/50 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.impact_description}</p>
                      </div>
                      <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded font-mono">
                        {s.role?.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  Impacted Downstream Tasks
                </p>
                <div className="space-y-1.5">
                  {impactResult.affected_tasks?.map((t: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs bg-slate-800/50 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{t.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.impact_description}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>

              {impactResult.recommendations && (
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                    AI Mitigation Recommendations
                  </p>
                  <div className="space-y-1.5">
                    {impactResult.recommendations.map((r: string, i: number) => (
                      <div
                        key={i}
                        className="text-xs text-slate-300 bg-orange-500/5 border border-orange-500/20 rounded-lg p-2.5 flex items-start gap-2"
                      >
                        <span className="text-orange-400 font-mono text-[11px] mt-0.5">0{i + 1}</span>
                        <p className="leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Submit New Change Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Quick Example Presets:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_CHANGES.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ⚡ {preset.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Change Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Move kitchen island, Change flooring material..."
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Description of Change</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  placeholder="Provide scope of modification..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Reason for Change</label>
                <input
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g., Client preference, site condition discovery..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/20"
                >
                  {submitting ? "Submitting..." : "Submit & Analyze Impact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
