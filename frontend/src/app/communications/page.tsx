"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";

interface SampleTemplate {
  name: string;
  sourceType: string;
  title: string;
  content: string;
}

const SAMPLE_COMMUNICATIONS: SampleTemplate[] = [
  {
    name: "WhatsApp: Kitchen MEP Coordination",
    sourceType: "whatsapp",
    title: "Kitchen Island Relocation & Core Drilling Chat",
    content: `[09:15] Rajiv Mehra (Client): Hi team, after reviewing the 3D render with Neha, we've decided: move the kitchen island 1.2 meters towards the terrace window.
[09:18] Ananya Sharma (Architect): Understood Rajiv. Confirmed: We will redraw architectural sheet Rev-C2 by Friday.
[09:22] Priya Nair (Electrical Engineer): Warning: Moving the island impacts floor conduit routing. Risk: Coring concrete slab near beam line could compromise structural tension cables if not scanned first.
[09:25] Deepak Singh (Contractor): Agreed: Pausing kitchen sub-floor screed until scanning is completed. Action item: Schedule GPR concrete scan by Monday.
[09:29] Sanjay Kapoor (Furniture Vendor): Will complete cabinetry carcass fabrication once revised CAD arrives. Deadline: Need CAD by 15th October to avoid millwork delays.`,
  },
  {
    name: "Site Meeting Notes: MEP & Slab Channel",
    sourceType: "meeting_notes",
    title: "Weekly Site Coordination Meeting #04",
    content: `Meeting Date: 2026-09-10
Attendees: Ananya Sharma, Vikram Patel, Priya Nair, Deepak Singh

Key Discussions:
1. Decision: Approved relocation of HVAC ceiling cassette in master bedroom to preserve recessed linear light detail.
2. Risk: Heavy monsoon rains causing water seepage in basement retaining wall. High hazard to electrical switchgear rough-in.
3. Task: Vikram Patel will inspect retaining wall waterproofing integrity by tomorrow afternoon.
4. Action: Deepak Singh to install temporary sump pumps and protective tarpaulins immediately.
5. Action: Priya Nair assigned to submit revised DB schedule and single line diagram by 18th September.`,
  },
  {
    name: "Email: Italian Marble Delivery Update",
    sourceType: "email",
    title: "Notice of Port Clearance Delay - Carrara Marble Consignment",
    content: `From: Global Stone Importers (Sanjay Kapoor)
To: Arjun Reddy, Ananya Sharma
Subject: Urgent - Consignment #GS-884 Custom Hold

Dear Project Team,
We regret to inform you that the shipment of Calacatta Gold marble tiles has been placed under customs quarantine at Nhava Sheva port.
Risk: Estimated delivery delay of 8 to 10 days for living room floor installation.
Decision: Agreed in today's vendor review to prioritize foyer and corridor dry-lay while main slabs are cleared.
Action: Contractor Deepak Singh will re-assign tiling crews to guest bathroom mosaic tiling to mitigate labor idle time.
Deadline: Expected customs release date is next week Friday.`,
  },
  {
    name: "Client Call Transcript: Finishes & Smart Home",
    sourceType: "transcript",
    title: "Client Design Signoff Call Transcript",
    content: `Rajiv Mehra: I loved the sample boards Neha brought yesterday.
Neha Joshi: Great Rajiv. So we confirmed the brushed bronze hardware for the main foyer joinery.
Rajiv Mehra: Yes, confirmed. But what about the smart lighting automation integration with Lutron?
Priya Nair: Lutron keypads require low-voltage Cat6 cabling to each junction box.
Priya Nair: Task: Prepare updated smart home conduit diagram by end of week.
Deepak Singh: Action item: Verify that electrician does not pull high-voltage cable in the same conduit.
Ananya Sharma: Decision: Approved Lutron Palladiom matte black keypad specification for all common areas.`,
  },
];

export default function CommunicationsPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [sourceType, setSourceType] = useState("whatsapp");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const applyTemplate = (sample: SampleTemplate) => {
    setSourceType(sample.sourceType);
    setTitle(sample.title);
    setContent(sample.content);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await api.conversations.upload({ project_id: projectId, source_type: sourceType, content, title });
      setResult(res.extraction);
    } catch {
      setResult({ summary: "Failed to process content." });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Communication Intelligence</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Ingest WhatsApp threads, meeting notes, and email transcripts to extract structured project records
          </p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Load Realistic Coordination Sample:
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COMMUNICATIONS.map((sample) => (
            <button
              key={sample.name}
              onClick={() => applyTemplate(sample)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-orange-400 font-mono text-[11px]">⚡</span>
              <span>{sample.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Upload & Analyze Communication</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Source Type</label>
              <div className="flex gap-2">
                {["whatsapp", "meeting_notes", "email", "transcript"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSourceType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      sourceType === t
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                        : "text-slate-400 bg-slate-800/60 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Subject / Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Subject line or meeting topic..."
                className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Conversation Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="Paste WhatsApp chat export, site meeting notes, vendor emails, or recorded conversation transcripts..."
                className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/60 resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={loading || !content.trim()}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block">◌</span>
                  <span>Extracting Intelligence...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Extract Structured Project Records</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Extracted Intelligence</h3>
          {!result ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              <p className="text-4xl mb-3 text-slate-700">⟐</p>
              <p className="text-slate-400 font-medium">No communication processed yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Select a sample above and click &quot;Extract Structured Project Records&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              {result.summary && (
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3.5">
                  <p className="text-[10px] text-orange-400 uppercase font-mono tracking-wider mb-1 font-semibold">
                    AI Summary
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>
                </div>
              )}
              {renderEntitySection("Detected Tasks", result.tasks, "emerald")}
              {renderEntitySection("Decisions Logged", result.decisions, "blue")}
              {renderEntitySection("Identified Risks", result.risks, "red")}
              {renderEntitySection("Action Items", result.action_items, "amber")}
              {renderEntitySection("Active Stakeholders", result.stakeholders, "purple")}
              {renderEntitySection("Deadlines & Milestones", result.deadlines, "orange")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderEntitySection(title: string, items: any[], colorTheme: string) {
  if (!items || items.length === 0) return null;
  const badgeClasses: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    red: "text-red-400 border-red-500/30 bg-red-500/10",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    orange: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  };

  return (
    <div className="bg-slate-800/30 border border-slate-800/60 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">{title}</p>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClasses[colorTheme] || badgeClasses.blue}`}>
          {items.length} items
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="text-xs text-slate-300 bg-slate-800/60 border border-slate-700/50 rounded-lg p-2 flex flex-col gap-1">
            {typeof item === "string" ? (
              <span>{item}</span>
            ) : (
              <div>
                <p className="font-medium text-white">{item.title || item.name || item.description}</p>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1">
                  {item.assignee_hint && <span>Assignee: {item.assignee_hint}</span>}
                  {item.decided_by_hint && <span>Decided By: {item.decided_by_hint}</span>}
                  {item.owner_hint && <span>Owner: {item.owner_hint}</span>}
                  {item.severity && <span className="text-red-400 uppercase font-semibold">Severity: {item.severity}</span>}
                  {item.deadline_hint && <span className="text-amber-400">Due: {item.deadline_hint}</span>}
                  {item.date_hint && <span className="text-amber-400">Date: {item.date_hint}</span>}
                  {item.role_hint && <span className="text-blue-400">Role: {item.role_hint}</span>}
                  {item.priority && <span className="uppercase">Priority: {item.priority}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
