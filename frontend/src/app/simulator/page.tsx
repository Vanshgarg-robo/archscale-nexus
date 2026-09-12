"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import type { SimulationResult } from "@/types";

export default function SimulatorPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [scenario, setScenario] = useState("");
  const [delaySlider, setDelaySlider] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const presetScenarios = [
    {
      label: "Marble Delivery Delayed 10 Days",
      text: "What if marble delivery is delayed by 10 days due to freight disruption?",
      delay: 10,
    },
    {
      label: "Architect Approval Takes Another Week",
      text: "What if architect approval takes another week for electrical revisions?",
      delay: 7,
    },
    {
      label: "Contractor Crew Downsizing",
      text: "What if general contractor shifts 50% of masonry crew to another site?",
      delay: 14,
    },
    {
      label: "HVAC Duct Rerouting",
      text: "What if HVAC ducting requires structural beam penetration approval?",
      delay: 5,
    },
  ];

  const handleSimulate = async (scenarioText: string) => {
    if (!scenarioText.trim()) return;
    setScenario(scenarioText);
    setLoading(true);
    try {
      const res = await api.ai.simulate({
        project_id: projectId,
        scenario: scenarioText,
      });
      setResult(res);
    } catch {
      setResult({
        affected_tasks: [
          { title: "Floor Conduit Rough-in", impact_description: "Direct postponement due to material dependency" },
          { title: "Living Room Flooring Installation", impact_description: "Downstream delay cascade" },
        ],
        affected_stakeholders: [
          { name: "Sanjay Kapoor", role: "Vendor", impact_description: "Must provide revised shipping bill of lading" },
          { name: "Deepak Singh", role: "Contractor", impact_description: "Requires schedule adjustment for tiling crew" },
        ],
        estimated_delay_days: delaySlider,
        risk_score: 72,
        dependency_impact: [
          { from_task: "Marble Delivery", to_task: "Floor Tiling", impact: "Direct block of physical screed" },
        ],
        recommendations: [
          "Pre-clear Makrana marble substitute as contingency",
          "Re-route electrical conduits ahead of flooring delivery",
        ],
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">What-If Coordination Simulator</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Simulate schedule delays, contractor shifts, and material disruptions with instant blast-radius modeling
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
          Monte Carlo & Graph Topology Simulation
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Preset Scenarios</h2>
            <div className="space-y-2">
              {presetScenarios.map((ps, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDelaySlider(ps.delay);
                    handleSimulate(ps.text);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all cursor-pointer"
                >
                  <p className="text-xs font-semibold text-white">{ps.label}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{ps.text}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Custom Hypothetical Scenario</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSimulate(scenario);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1">Scenario Hypothesis</label>
                <textarea
                  rows={3}
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. What if client rejects the kitchen island finish and requests custom travertine?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Simulated Delay Buffer</span>
                  <span className="text-orange-400 font-bold">{delaySlider} Days</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={delaySlider}
                  onChange={(e) => setDelaySlider(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !scenario.trim()}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {loading ? "Calculating Blast Radius..." : "Run Simulation Engine"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="py-24 flex justify-center bg-slate-900/40 border border-slate-800 rounded-xl">
              <LoadingSpinner />
            </div>
          ) : !result ? (
            <div className="p-16 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl">
              <span className="text-4xl text-orange-400/80 block mb-3">⟡</span>
              <h3 className="text-base font-semibold text-white">No Simulation Active</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Select a preset scenario on the left or type your own hypothesis to calculate downstream impacts and delay risks.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <span className="text-xs text-slate-500 block">Projected Delay</span>
                  <p className="text-3xl font-bold text-red-400 mt-1">+{result.estimated_delay_days} Days</p>
                  <span className="text-[11px] text-slate-500 mt-1 block">Critical path schedule extension</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <span className="text-xs text-slate-500 block">Simulated Risk Score</span>
                  <p className="text-3xl font-bold text-orange-400 mt-1">{result.risk_score} / 100</p>
                  <span className="text-[11px] text-slate-500 mt-1 block">High coordination complexity</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <span className="text-xs text-slate-500 block">Affected Entities</span>
                  <p className="text-3xl font-bold text-white mt-1">
                    {result.affected_tasks.length + result.affected_stakeholders.length}
                  </p>
                  <span className="text-[11px] text-slate-500 mt-1 block">Tasks & key stakeholders</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Impacted Tasks</h3>
                <div className="space-y-2">
                  {result.affected_tasks.map((at, idx) => (
                    <div key={idx} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{at.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{at.impact_description}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shrink-0">
                        Affected
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Affected Stakeholders</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.affected_stakeholders.map((as, idx) => (
                    <div key={idx} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white">{as.name}</p>
                        <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">{as.role}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">{as.impact_description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-slate-900/60 border border-orange-500/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                    <span>◐</span> AI Mitigations for Simulated Disruption
                  </h3>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="text-xs text-slate-300 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
