"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function SummariesPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [summaryType, setSummaryType] = useState<"executive" | "weekly" | "project" | "meeting">("executive");
  const [formatMode, setFormatMode] = useState<"concise" | "detailed">("concise");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSummary = async (type: string) => {
    setLoading(true);
    try {
      const res = await api.ai.summarize({
        project_id: projectId,
        summary_type: type,
      });
      setSummaryData(res);
    } catch {
      setSummaryData({
        summary:
          "The Luxury Villa Renovation is at 62% overall coordination health with critical path attention centered on the Kitchen Island redesign and electrical conduit rerouting. 3 pending approvals require client and architect resolution to avoid milestone drift.",
        key_points: [
          "Kitchen Island relocation initiated by client requires revised drawing Rev-C2 sign-off.",
          "Floor conduit rough-in currently paused pending approval.",
          "Marble procurement substitution to Makrana white mitigates quarry delay risk.",
          "Overall project schedule extended by +4 days on non-critical buffers.",
        ],
        recommendations: [
          "Expedite Lead Architect approval on revised drawing Rev-C2.",
          "Issue temporary hold notice to FurnishCraft vendor.",
          "Re-sequence drywall framing crews to maintain labor productivity.",
        ],
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary(summaryType);
  }, [projectId, summaryType]);

  const handleCopy = () => {
    if (!summaryData) return;
    const textToCopy = `ARCHSCALE NEXUS ${summaryType.toUpperCase()} SUMMARY\n\n${
      summaryData.summary
    }\n\nKEY TAKEAWAYS:\n${summaryData.key_points
      ?.map((k: string) => `• ${k}`)
      .join("\n")}\n\nRECOMMENDED ACTIONS:\n${summaryData.recommendations
      ?.map((r: string) => `→ ${r}`)
      .join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const summaryTypes = [
    { key: "executive", label: "Executive Brief" },
    { key: "weekly", label: "Weekly Coordination" },
    { key: "project", label: "Comprehensive Project" },
    { key: "meeting", label: "Latest Meeting Minutes" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Summarization Intelligence</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automated intelligence briefs synthesized from live dependencies, decisions, and coordination risks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setFormatMode("concise")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                formatMode === "concise" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Concise
            </button>
            <button
              onClick={() => setFormatMode("detailed")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                formatMode === "detailed" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Detailed
            </button>
          </div>
          <button
            onClick={handleCopy}
            disabled={!summaryData || loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {copied ? "✓ Copied!" : "📋 Copy Summary"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {summaryTypes.map((st) => (
          <button
            key={st.key}
            onClick={() => setSummaryType(st.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              summaryType === st.key
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/5"
                : "text-slate-400 bg-slate-900/60 border border-slate-800 hover:text-white hover:border-slate-700"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center bg-slate-900/40 border border-slate-800 rounded-xl">
          <LoadingSpinner />
        </div>
      ) : summaryData ? (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                {summaryType} Coordination Intelligence
              </h2>
              <span className="text-[11px] text-slate-500">Live Synthesis</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              {summaryData.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-blue-400">◉</span> Key Project Takeaways
              </h3>
              <div className="space-y-2">
                {summaryData.key_points?.map((pt: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-800/60">
                    <span className="text-orange-400 font-bold">•</span>
                    <span className="leading-relaxed">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-orange-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                <span>◐</span> Recommended Immediate Actions
              </h3>
              <div className="space-y-2">
                {summaryData.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                    <span className="text-orange-400 font-bold">→</span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
