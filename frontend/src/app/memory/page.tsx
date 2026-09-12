"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function ProjectMemoryPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sampleQueries = [
    "Why was marble changed?",
    "Who approved the kitchen redesign?",
    "What delayed the electrical installation?",
    "Show historical change requests and their impact",
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true);
    try {
      const res = await api.memory.search({
        project_id: projectId,
        query: searchQuery,
      });
      setResult(res);
    } catch {
      setResult({
        answer: "Unable to retrieve records from project memory index at this time.",
        citations: [],
        matched_entities: {},
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Memory</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Audit-grade institutional knowledge base preserving decisions, design shifts, and approval lineage
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
          Semantic Memory Active
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Query Project History, Decisions & Audit Logs
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask e.g. Why was marble changed? Who approved kitchen island relocation?"
                className="flex-1 bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {loading ? "Searching..." : "Search Memory"}
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 block mb-2 font-medium">Quick Query Prompts:</span>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSearch(sq)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {loading && (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-400 text-lg">◐</span>
              <h2 className="text-base font-semibold text-white">Synthesized Memory Retrieval</h2>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              {result.answer}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-blue-400">§</span> Direct Citations & Grounding Records
            </h3>

            {result.citations && result.citations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.citations.map((cite: any, i: number) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                      <span className="text-orange-400 font-semibold">{cite.source_type}</span>
                      <span>{cite.timestamp ? new Date(cite.timestamp).toLocaleDateString() : "Historical"}</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{cite.reference}</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{cite.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No external records matched this query terms.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
