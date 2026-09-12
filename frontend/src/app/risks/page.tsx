"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { getSeverityIcon } from "@/lib/utils";
import type { Risk } from "@/types";

export default function RisksPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.risks.list(projectId),
      api.risks.summary(projectId),
    ])
      .then(([riskList, sum]) => {
        setRisks(riskList);
        setSummary(sum);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <LoadingSpinner />;

  const filteredRisks =
    categoryFilter === "all"
      ? risks
      : risks.filter((r) => r.category.toLowerCase() === categoryFilter.toLowerCase());

  const categories = [
    { key: "all", label: "All Categories" },
    { key: "schedule", label: "Schedule Risk" },
    { key: "approval", label: "Approval Risk" },
    { key: "dependency", label: "Dependency Risk" },
    { key: "vendor", label: "Vendor Risk" },
    { key: "coordination", label: "Coordination Risk" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Risk Intelligence</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Predictive evaluation of schedule, approval, vendor, dependency, and coordination hazards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            {risks.length} Tracked Risks
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {summary?.by_severity?.critical || 0} Critical
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">Critical</span>
          <p className="text-2xl font-bold text-red-400 mt-1">{summary?.by_severity?.critical || 0}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">High</span>
          <p className="text-2xl font-bold text-orange-400 mt-1">{summary?.by_severity?.high || 0}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">Medium</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{summary?.by_severity?.medium || 0}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">Low</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{summary?.by_severity?.low || 0}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">Max Severity</span>
          <p className="text-2xl font-bold text-white mt-1 uppercase text-sm font-mono pt-1">
            {summary?.max_severity || "Medium"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              categoryFilter === cat.key
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                : "text-slate-400 bg-slate-900/60 border border-slate-800 hover:text-white hover:border-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRisks.map((risk) => {
          const isCritical = risk.severity.toLowerCase() === "critical" || risk.severity.toLowerCase() === "high";
          return (
            <div
              key={risk.id}
              className={`bg-slate-900/60 border rounded-xl p-5 transition-all ${
                isCritical ? "border-red-500/25 shadow-sm shadow-red-500/5" : "border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">{getSeverityIcon(risk.severity)}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-snug">{risk.title}</h3>
                    <span className="text-[10px] text-orange-400/90 uppercase font-semibold tracking-wider">
                      {risk.category} Risk
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-white font-mono">{risk.risk_score}</span>
                  <span className="text-[10px] text-slate-500 block">Risk Score</span>
                </div>
              </div>

              {risk.description && (
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{risk.description}</p>
              )}

              {risk.mitigation && (
                <div className="mt-4 p-3 bg-slate-800/40 border border-slate-800 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Mitigation Plan
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">{risk.mitigation}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500 block text-[10px]">Probability</span>
                  <span className="text-white font-medium">{Math.round(risk.probability * 100)}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Impact</span>
                  <span className="text-white font-medium">{risk.impact_score}/10</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Severity</span>
                  <StatusBadge status={risk.severity} size="sm" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
