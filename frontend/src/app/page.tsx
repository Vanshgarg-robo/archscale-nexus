"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getRelativeTime, getSeverityIcon, getRoleLabel } from "@/lib/utils";
import type { DashboardData } from "@/types";

interface DemoStep {
  step: number;
  title: string;
  status: string;
  data: any;
}

export default function CommandCenter() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    success: boolean;
    message: string;
    steps: DemoStep[];
    health_score: number;
    health_status: string;
    recommendations: string[];
  } | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const loadDashboard = async () => {
    try {
      const d = await api.dashboard.get(projectId);
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDashboard();
  }, [projectId]);

  const handleRunDemo = async () => {
    setDemoRunning(true);
    try {
      const res = await api.demo.triggerKitchenRedesign();
      setDemoResult(res);
      if (res.steps && res.steps.length > 0) {
        setActiveStepIndex(0);
      }
      await loadDashboard();
    } catch {
    } finally {
      setDemoRunning(false);
    }
  };

  const handleResetDemo = async () => {
    setDemoRunning(true);
    try {
      await api.demo.reset();
      setDemoResult(null);
      setActiveStepIndex(null);
      await loadDashboard();
    } catch {
    } finally {
      setDemoRunning(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await api.ai.chat({ project_id: projectId, message: chatInput, history: chatMessages });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Unable to process request." }]);
    }
    setChatLoading(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <p className="text-sm text-slate-300">Unable to reach project intelligence service.</p>
        <button
          onClick={() => {
            setLoading(true);
            loadDashboard();
          }}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md shadow-orange-500/20"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const h = data.health;
  const healthColor = h.score >= 70 ? "emerald" : h.score >= 40 ? "amber" : "red";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"></span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Executive Command Center</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
              MISSION CONTROL
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-stakeholder coordination, dependency tracking, and automated risk intelligence
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/knowledge-graph"
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>❖</span> Graph Engine
          </Link>
          <Link
            href="/simulator"
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>⎈</span> What-If Sim
          </Link>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 border border-orange-500/30 rounded-lg text-xs font-semibold hover:from-orange-500/30 hover:to-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/5"
          >
            <span>◐</span> AI Project Manager
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-orange-950/20 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Interactive Scenario Demo
              </span>
              <span className="text-xs text-slate-400">Live Coordination Chain Simulation</span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Change Event:</span>
              <span className="text-orange-400">&quot;Client Requests Kitchen Redesign&quot;</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Simulates client Rajiv Mehra requesting an island relocation. ArchScale Nexus automatically triggers
              an 8-step coordination cascade: extracts stakeholders, finds dependencies, flags blockers, issues approvals,
              calculates critical delay, and updates health.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunDemo}
              disabled={demoRunning}
              className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-2"
            >
              {demoRunning ? (
                <>
                  <span className="animate-spin inline-block">◌</span>
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>Run 8-Step Pipeline</span>
                </>
              )}
            </button>
            <button
              onClick={handleResetDemo}
              disabled={demoRunning}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { num: 1, title: "Change Request", desc: "CR-002 Created" },
            { num: 2, title: "Stakeholders", desc: "4 Affected" },
            { num: 3, title: "Dependencies", desc: "Downstream Map" },
            { num: 4, title: "Blockers", desc: "Rough-in Blocked" },
            { num: 5, title: "Approvals", desc: "Architect Signoff" },
            { num: 6, title: "Schedule Delay", desc: "+4 Days Impact" },
            { num: 7, title: "Project Health", desc: "Score: 52 (At Risk)" },
            { num: 8, title: "AI Strategy", desc: "Action Plan" },
          ].map((item, idx) => {
            const isCompleted = demoResult && demoResult.steps && demoResult.steps.length >= item.num;
            const isSelected = activeStepIndex === idx;
            return (
              <div
                key={item.num}
                onClick={() => demoResult && setActiveStepIndex(idx)}
                className={`p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-orange-500/20 border-orange-500/60 ring-1 ring-orange-500/40"
                    : isCompleted
                    ? "bg-slate-800/80 border-emerald-500/40 hover:bg-slate-800"
                    : "bg-slate-900/40 border-slate-800/80 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Step 0{item.num}</span>
                  {isCompleted ? (
                    <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">○</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-white mt-1 truncate">{item.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
              </div>
            );
          })}
        </div>

        {demoResult && activeStepIndex !== null && demoResult.steps[activeStepIndex] && (
          <div className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-orange-400">
                Step {demoResult.steps[activeStepIndex].step}: {demoResult.steps[activeStepIndex].title}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase">
                {demoResult.steps[activeStepIndex].status}
              </span>
            </div>
            <div className="mt-2 text-slate-300 font-mono text-[11px] max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(demoResult.steps[activeStepIndex].data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Health Score" value={`${Math.round(h.score)}`} subtitle={h.status} color={healthColor} icon="⬡" />
        <MetricCard title="Total Tasks" value={data.task_summary.total} subtitle={`${data.task_summary.completion_rate}% complete`} color="blue" icon="◎" />
        <MetricCard title="In Progress" value={data.task_summary.in_progress} color="blue" icon="◉" />
        <MetricCard title="Blocked" value={data.task_summary.blocked} color="red" icon="⊘" />
        <MetricCard title="Pending Approvals" value={data.pending_approvals.length} color="amber" icon="◇" />
        <MetricCard title="Active Risks" value={data.risks.total_risks} color="orange" icon="△" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-orange-400">◐</span> AI Coordination Recommendations
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Priority Ranked</span>
            </div>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="text-sm text-slate-300 bg-slate-800/40 border border-slate-800 rounded-lg px-3.5 py-2.5 flex items-start gap-2.5">
                  <span className="text-orange-400 font-mono text-xs mt-0.5">0{i + 1}</span>
                  <p className="flex-1 text-xs leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-red-400">⊘</span> Active Blockers
              </h3>
              <Link href="/blockers" className="text-xs text-orange-400 hover:text-orange-300 font-medium">
                View All →
              </Link>
            </div>
            {data.blockers.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No active blockers</p>
            ) : (
              <div className="space-y-2">
                {data.blockers.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 bg-slate-800/30 border border-slate-800/60 rounded-lg p-3">
                    <span className="text-sm mt-0.5">{getSeverityIcon(b.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{b.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{b.reason}</p>
                      {b.owner_name && <p className="text-xs text-slate-500 mt-0.5">Owner: {b.owner_name}</p>}
                    </div>
                    <StatusBadge status={b.severity} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-amber-400">◇</span> Pending Approvals
              </h3>
              <Link href="/approvals" className="text-xs text-orange-400 hover:text-orange-300 font-medium">
                Manage Approvals →
              </Link>
            </div>
            <div className="space-y-2">
              {data.pending_approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-slate-800/30 border border-slate-800/60 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{a.title}</p>
                    <p className="text-xs text-slate-400">Approver: {a.approver_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.is_overdue && <span className="text-xs text-red-400 font-medium">{a.days_overdue}d overdue</span>}
                    <StatusBadge status={a.is_overdue ? "overdue" : "pending"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-3">Health Breakdown</h3>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
                <circle
                  cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                  strokeDasharray={`${h.score * 2.64} 264`}
                  strokeLinecap="round"
                  className={h.score >= 70 ? "text-emerald-400" : h.score >= 40 ? "text-amber-400" : "text-red-400"}
                  style={{ stroke: "currentColor", transition: "stroke-dasharray 1s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-2xl font-bold text-white">{Math.round(h.score)}</span>
                  <p className="text-[10px] text-slate-500 uppercase">{h.status}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400"><span>Overdue Tasks</span><span className="text-white font-medium">{h.overdue_tasks}</span></div>
              <div className="flex justify-between text-slate-400"><span>Pending Approvals</span><span className="text-white font-medium">{h.pending_approvals}</span></div>
              <div className="flex justify-between text-slate-400"><span>Blockers</span><span className="text-white font-medium">{h.blocker_count}</span></div>
              <div className="flex justify-between text-slate-400"><span>Active Risks</span><span className="text-white font-medium">{h.risk_count}</span></div>
              <div className="flex justify-between text-slate-400"><span>Dep. Failures</span><span className="text-white font-medium">{h.dependency_failures}</span></div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Risk Distribution</h3>
              <Link href="/risks" className="text-xs text-orange-400 hover:text-orange-300">Details →</Link>
            </div>
            <div className="space-y-2">
              {Object.entries(data.risks.by_severity).map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-2">
                  <span className="text-xs">{getSeverityIcon(sev)}</span>
                  <span className="text-xs text-slate-400 capitalize flex-1">{sev}</span>
                  <span className="text-xs text-white font-medium">{count as number}</span>
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sev === "critical" ? "bg-red-400" : sev === "high" ? "bg-orange-400" : sev === "medium" ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${((count as number) / Math.max(data.risks.total_risks, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Decisions</h3>
            <div className="space-y-3">
              {data.recent_decisions.map((d) => (
                <div key={d.id} className="border-l-2 border-slate-700 pl-3">
                  <p className="text-xs text-white font-medium">{d.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{d.decided_by} · {getRelativeTime(d.decided_at)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Stakeholder Matrix</h3>
              <Link href="/stakeholders" className="text-xs text-orange-400 hover:text-orange-300">All 10 →</Link>
            </div>
            <div className="space-y-2">
              {data.stakeholder_activity.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-medium">
                    {s.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500">{getRoleLabel(s.role)}</p>
                  </div>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${s.influence_score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {chatOpen && (
        <div className="fixed right-0 top-0 sm:top-16 bottom-0 w-full sm:w-96 bg-slate-950 border-l border-slate-800 z-50 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-orange-400">◐</span>
              <h3 className="text-sm font-semibold text-white">AI Project Manager</h3>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400">Ask natural language questions about project health, risks, blockers, and schedules.</p>
                <div className="mt-4 space-y-2">
                  {[
                    "Who is blocking kitchen installation?",
                    "Which approvals are pending?",
                    "What are the highest risks?",
                    "Summarize project status",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setChatInput(q)}
                      className="block w-full text-left text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-800 rounded-lg px-3 py-2 transition-colors cursor-pointer border border-slate-700/50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user" ? "bg-orange-500/20 text-orange-200 border border-orange-500/30" : "bg-slate-800 text-slate-200 border border-slate-700"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-400">Analyzing project graph...</div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-900/30">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                placeholder="Ask about the project..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handleChat}
                className="px-3.5 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
