"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import MarkdownRenderer from "@/components/ai-assistant/MarkdownRenderer";

interface AIConfig {
  is_enabled: boolean;
  model_name: string;
  provider: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  rate_limit_per_minute: number;
  updated_at?: string;
}

interface UsageStats {
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  avg_latency_ms: number;
  popular_routes: Array<{ route: string; count: number }>;
  daily_usage: Array<{ date: string; queries: number; tokens: number }>;
}

interface ConversationItem {
  id: number;
  session_uuid: string;
  user_name: string;
  user_email: string;
  title: string;
  current_page?: string;
  message_count: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PRESET_PROMPT = (
  "You are the ArchScale Nexus AI Assistant — the intelligent platform copilot and systems architect.\n" +
  "Your dual missions are:\n" +
  "1. WEB APPLICATION GUIDE: Help users navigate and master every feature of ArchScale Nexus. Guide them with clear, step-by-step instructions and clickable markdown links [Page Name](/route).\n" +
  "2. ARCHITECTURAL & SYSTEM INTELLIGENCE: Explain system architectures, microservices, databases, API design, cloud infrastructure, scaling strategies, DevOps pipelines, and security best practices.\n\n" +
  "=== ARCHSCALE NEXUS PLATFORM SITEMAP & CORE MODULES ===\n" +
  "- [Executive Command](/): Unified operational dashboard with project KPIs, schedule progress, and active trade alerts.\n" +
  "- [AI Impact Engine](/impact) (FLAGSHIP): Real-time change simulation engine. Lets users simulate drawing delays, change requests, and vendor lead times to analyze cascade ripple effects across trades.\n" +
  "- [AI Project Manager Chat](/chat): Conversational coordination intelligence for project-specific Q&A grounded in live project data.\n" +
  "- [Knowledge Graph](/knowledge-graph): Interactive visual node-and-edge graph modeling stakeholders, drawing packages, physical zones, and contractors.\n" +
  "- [Dependencies Graph](/dependencies): Directed Acyclic Graph (DAG) visualizing critical path milestones, circular dependencies, and trade handoffs.\n" +
  "- [Stakeholders](/stakeholders): Stakeholder engagement matrix, trade assignments, and workload breakdown.\n" +
  "- [Communications](/communications): Structured communication logs, meeting minutes, and action items.\n" +
  "- [Change Requests](/change-requests): Change request lifecycle tracking cost, schedule drift, and required trade approvals.\n" +
  "- [Approvals](/approvals): Governance approvals portal where architects, clients, and engineers review and clear drawing submittals.\n" +
  "- [Blocker Detection](/blockers): Real-time blocker radar pinpointing trade bottlenecks, root causes, and unblocking actions.\n" +
  "- [Risk Intelligence](/risks): Predictive risk scoring, schedule delay quantification, and mitigation checklists.\n" +
  "- [Coordination Alerts](/alerts): Live notifications and broadcast alerts.\n" +
  "- [What-If Simulator](/simulator): Interactive sliders to model budget variances and schedule drift.\n" +
  "- [Project Memory](/memory): Searchable institutional archive of historical project decisions.\n" +
  "- [AI Summaries](/summaries): Executive briefings, trade summaries, and automated weekly wrap-ups.\n" +
  "- [Administration](/admin): Platform governance, user CRUD, RBAC roles, audit logs, node monitoring, settings, and AI controls.\n" +
  "- [User Profile & Account](/user): User identity coordinates (username, full name, email, phone number), security, and password change.\n" +
  "- [Login & Switch Portal](/login): Instant 1-click role switcher across 11 roles (Admin, Architect, Engineer, PM, Contractor, Client, Vendor, Supervisor, Analyst, Operator, Viewer).\n\n" +
  "GUIDELINES FOR USER RESPONSES:\n" +
  "- Be friendly, helpful, clear, and directly actionable.\n" +
  "- Always include clickable markdown links [Page Name](/route) when mentioning sections of the platform.\n" +
  "- If asked about the current page, explain what actions the user can take right now on that page.\n" +
  "- If asked technical or architectural questions, provide senior-level architectural depth, structured ASCII diagrams, and syntax-highlighted code blocks.\n" +
  "- Format with bold headers (##, ###), bullet points, and clean spacing."
);

export default function AdminAIAssistantPage() {
  const authUser = useAuthStore((s) => s.user);

  // Active Tab: 'config' | 'usage' | 'conversations'
  const [activeTab, setActiveTab] = useState<"config" | "usage" | "conversations">("config");

  // Config State
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Usage State
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Conversations State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal State
  const [inspectSession, setInspectSession] = useState<any | null>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Fetch Config
  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await api.aiAssistant.admin.getConfig();
      setConfig(res);
    } catch (err: any) {
      setConfigError(err?.message || "Failed to load AI Assistant config");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // Fetch Usage
  const fetchUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await api.aiAssistant.admin.getUsage();
      setUsage(res);
    } catch {}
    finally {
      setLoadingUsage(false);
    }
  }, []);

  // Fetch Conversations
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await api.aiAssistant.admin.getConversations({ search: searchQuery });
      setConversations(res.conversations);
      setTotalConversations(res.total);
    } catch {}
    finally {
      setLoadingConversations(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (authUser?.role === "admin") {
      fetchConfig();
      fetchUsage();
      fetchConversations();
    }
  }, [authUser, fetchConfig, fetchUsage, fetchConversations]);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;

    setSavingConfig(true);
    setConfigSuccess(null);
    setConfigError(null);

    try {
      const updated = await api.aiAssistant.admin.updateConfig({
        is_enabled: config.is_enabled,
        model_name: config.model_name,
        provider: config.provider,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        system_prompt: config.system_prompt,
        rate_limit_per_minute: config.rate_limit_per_minute,
      });
      setConfig(updated);
      setConfigSuccess("AI Assistant configuration saved successfully!");
      setTimeout(() => setConfigSuccess(null), 4000);
    } catch (err: any) {
      setConfigError(err?.message || "Failed to update configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleMaster = async () => {
    if (!config) return;
    const newStatus = !config.is_enabled;
    setConfig({ ...config, is_enabled: newStatus });

    try {
      await api.aiAssistant.admin.updateConfig({ is_enabled: newStatus });
      setConfigSuccess(`AI Assistant ${newStatus ? "Enabled" : "Disabled"} system-wide.`);
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch {
      setConfig({ ...config, is_enabled: !newStatus });
    }
  };

  const handleInspect = async (sessionUuid: string) => {
    setLoadingInspect(true);
    try {
      const detail = await api.aiAssistant.getSession(sessionUuid);
      setInspectSession(detail);
    } catch {
      alert("Failed to load conversation transcript");
    } finally {
      setLoadingInspect(false);
    }
  };

  if (authUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mb-4">
          ⊘
        </div>
        <h3 className="text-sm font-bold text-red-400 mb-1">Access Denied</h3>
        <p className="text-xs text-slate-500">Administrator privileges required to manage AI Assistant.</p>
      </div>
    );
  }

  if (loadingConfig && !config) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-300">AI Assistant Governance</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-orange-400">🤖</span> AI Assistant Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure system architecture models, customize prompt reasoning, monitor usage analytics, and inspect conversations.
          </p>
        </div>

        {/* Master Switch Status Card */}
        <div className="flex items-center gap-3 bg-[#0B1120] border border-slate-800 px-4 py-2.5 rounded-2xl shadow-md">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Chatbot Status</p>
            <p className="text-xs font-bold text-white flex items-center gap-1.5 justify-end mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  config?.is_enabled ? "bg-emerald-400 animate-pulse" : "bg-red-500"
                }`}
              />
              <span>{config?.is_enabled ? "OPERATIONAL" : "DISABLED"}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleMaster}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              config?.is_enabled
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {config?.is_enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab("config")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "config"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>⚙</span>
          <span>Model & System Prompts</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("usage");
            fetchUsage();
          }}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "usage"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>📊</span>
          <span>Usage Analytics</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("conversations");
            fetchConversations();
          }}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "conversations"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>💬</span>
          <span>User Conversations ({totalConversations})</span>
        </button>
      </div>

      {/* TAB 1: MODEL & SYSTEM PROMPT CONFIG */}
      {activeTab === "config" && config && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {configSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <span>✓</span>
              <span>{configSuccess}</span>
            </div>
          )}

          {configError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
              <span>⚠</span>
              <span>{configError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Inference Parameters */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <span>⚡</span> Model Settings
                </h3>

                {/* Provider */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">AI Provider</label>
                  <select
                    value={config.provider}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="openai">OpenAI (Recommended)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>

                {/* Model Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">AI Model</label>
                  <select
                    value={config.model_name}
                    onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer font-mono"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Fast & Intelligent)</option>
                    <option value="gpt-4o">gpt-4o (Deep Reasoning Flagship)</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Google GenAI)</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">Temperature</label>
                    <span className="text-xs font-mono text-orange-400">{config.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                {/* Max Output Tokens */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Max Output Tokens</label>
                  <input
                    type="number"
                    min="256"
                    max="8000"
                    step="128"
                    value={config.max_tokens}
                    onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 2000 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Rate Limit Per Minute */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Rate Limit (Queries / Client / Min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={config.rate_limit_per_minute}
                    onChange={(e) =>
                      setConfig({ ...config, rate_limit_per_minute: parseInt(e.target.value) || 30 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sliding window rate limit applied per client IP / logged-in user.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: System Prompt Editor */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>🧠</span> Architectural System Prompt
                  </h3>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, system_prompt: DEFAULT_PRESET_PROMPT })}
                    className="text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                  >
                    Restore Default Prompt
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Instructs the assistant on architectural domain knowledge, microservice patterns, database design, and markdown guidelines.
                </p>

                <textarea
                  rows={16}
                  value={config.system_prompt}
                  onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                  className="flex-1 w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-orange-500 resize-y custom-scrollbar"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {config.system_prompt.length} characters • {config.system_prompt.split(/\s+/).length} words
                  </span>

                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingConfig ? "Saving Changes..." : "Save AI Configuration"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: USAGE & PERFORMANCE ANALYTICS */}
      {activeTab === "usage" && (
        <div className="space-y-6">
          {loadingUsage && !usage ? (
            <LoadingSpinner />
          ) : usage ? (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Total Sessions
                  </span>
                  <p className="text-2xl font-black text-white mt-1">{usage.total_sessions}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Active conversation threads</p>
                </div>

                <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Total Messages
                  </span>
                  <p className="text-2xl font-black text-orange-400 mt-1">{usage.total_messages}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Queries & responses</p>
                </div>

                <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Tokens Consumed
                  </span>
                  <p className="text-2xl font-black text-cyan-400 mt-1">{usage.total_tokens.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Prompt + completion tokens</p>
                </div>

                <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Avg Latency
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{usage.avg_latency_ms} ms</p>
                  <p className="text-[10px] text-slate-500 mt-1">Stream generation speed</p>
                </div>
              </div>

              {/* Popular Routes Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <span>📍</span> Most Active Context Routes
                  </h3>
                  {usage.popular_routes.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No route traffic recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {usage.popular_routes.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="font-mono text-xs text-orange-300">{r.route}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{r.count}</span>
                            <span className="text-[10px] text-slate-500">queries</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <span>📈</span> Daily Query Volume (Past 7 Days)
                  </h3>
                  {usage.daily_usage.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No daily activity logged yet</p>
                  ) : (
                    <div className="space-y-2">
                      {usage.daily_usage.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                          <span className="font-mono text-slate-400">{d.date}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-orange-400 font-bold">{d.queries} queries</span>
                            <span className="text-slate-500 font-mono">({d.tokens.toLocaleString()} tokens)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 3: CONVERSATION EXPLORER */}
      {activeTab === "conversations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations by user, email, or topic..."
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-full sm:w-80"
            />
            <button
              onClick={fetchConversations}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white font-medium cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Topic / Title</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Context Route</th>
                    <th className="px-4 py-3">Messages</th>
                    <th className="px-4 py-3">Tokens</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {loadingConversations ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading conversations...
                      </td>
                    </tr>
                  ) : conversations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No conversations recorded yet
                      </td>
                    </tr>
                  ) : (
                    conversations.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white max-w-xs truncate">
                          {c.title}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{c.user_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{c.user_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                            {c.current_page || "/"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{c.message_count}</td>
                        <td className="px-4 py-3 font-mono text-cyan-400">
                          {c.total_tokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(c.updated_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspect(c.session_uuid)}
                            className="px-3 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT MODAL */}
      {inspectSession && (
        <Modal
          isOpen={true}
          onClose={() => setInspectSession(null)}
          title={`Conversation: ${inspectSession.title}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800 font-mono">
              <span>Session: {inspectSession.session_uuid}</span>
              <span>Context Route: {inspectSession.current_page || "/"}</span>
            </div>

            {inspectSession.messages.map((m: any) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl text-xs space-y-1.5 ${
                  m.role === "user"
                    ? "bg-slate-900 border border-slate-800 text-white"
                    : "bg-[#070B14] border border-orange-500/20 text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase font-bold text-orange-400">{m.role}</span>
                  <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                </div>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <MarkdownRenderer content={m.content} />
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
