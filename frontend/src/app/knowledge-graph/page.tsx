"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/project-store";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/shared/StatusBadge";
import { getRoleLabel } from "@/lib/utils";

const statusColors: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#3b82f6",
  not_started: "#64748b",
  blocked: "#ef4444",
  on_hold: "#f59e0b",
  cancelled: "#475569",
};

const typeColors: Record<string, string> = {
  task: "#1e293b",
  stakeholder: "#172554",
  vendor: "#1c1917",
  change_request: "#2a1b3d",
};

export default function KnowledgeGraphPage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rawGraphData, setRawGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    api.graph
      .get(projectId)
      .then((data) => {
        setRawGraphData(data);
        const positioned = positionNodes(data.nodes, data.edges);
        setNodes(positioned.nodes);
        setEdges(positioned.edges);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const onNodeClick = (_: any, node: Node) => {
    const raw = rawGraphData.nodes.find((n) => n.id === node.id);
    setSelectedNode(raw || node.data);
  };

  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (filter !== "all") {
      list = list.filter((n) => n.data.entityType === filter);
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((n) => (n.data.label as string)?.toLowerCase().includes(lower));
    }
    return list;
  }, [nodes, filter, searchTerm]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Relationships for selected node
  const selectedRelations = useMemo(() => {
    if (!selectedNode) return { upstream: [], downstream: [] };
    const nodeId = selectedNode.id;
    const upstream = rawGraphData.edges
      .filter((e) => e.target === nodeId)
      .map((e) => {
        const src = rawGraphData.nodes.find((n) => n.id === e.source);
        return { ...e, connectedNode: src };
      });
    const downstream = rawGraphData.edges
      .filter((e) => e.source === nodeId)
      .map((e) => {
        const tgt = rawGraphData.nodes.find((n) => n.id === e.target);
        return { ...e, connectedNode: tgt };
      });
    return { upstream, downstream };
  }, [selectedNode, rawGraphData]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-500 font-bold">◈</span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded">
              Topology & Semantic Linkage
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Project Knowledge Graph
          </h1>
          <p className="text-xs text-slate-400">
            Interactive relationship visualizer. Click any node to inspect trade dependencies, blockers, and impact cascades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search nodes by name..."
            className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-48"
          />

          <div className="flex gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {["all", "task", "stakeholder", "vendor", "change_request"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filter === f
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f === "all" ? "All" : f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Flow Canvas with Slide-Over Inspector */}
      <div className="relative h-[calc(100vh-12rem)] bg-[#0A0E1A] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodeClick={onNodeClick}
          fitView
          colorMode="dark"
          defaultEdgeOptions={{ animated: true, style: { stroke: "#334155", strokeWidth: 1.5 } }}
        >
          <Background color="#161F33" gap={24} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !rounded-xl" />
          <MiniMap
            nodeColor={(node) => statusColors[node.data?.status as string] || "#64748b"}
            maskColor="rgba(10, 14, 26, 0.85)"
            className="!bg-[#0A0E1A] !border-slate-800 !rounded-xl"
          />
        </ReactFlow>

        {/* Slide-Over Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-96 max-w-[90vw] bg-[#0C1222]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-5 z-20 space-y-4 animate-in fade-in slide-in-from-right-4 max-h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  {selectedNode.type || "TASK"}
                </span>
                <h2 className="text-sm font-bold text-white mt-1.5 leading-snug">
                  {selectedNode.label || selectedNode.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status & Attributes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Entity Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedNode.status || "in_progress"} />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Role / Discipline</span>
                <p className="font-bold text-white mt-1 capitalize">
                  {selectedNode.role ? getRoleLabel(selectedNode.role) : selectedNode.metadata?.priority || "Architectural"}
                </p>
              </div>
            </div>

            {/* Upstream Dependencies */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Depends On ({selectedRelations.upstream.length})</span>
                <span className="text-[10px] text-slate-500 font-mono">Upstream Blockers</span>
              </h3>
              {selectedRelations.upstream.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-2 bg-slate-900/50 rounded-lg">No upstream prerequisite tasks</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedRelations.upstream.map((rel, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {rel.connectedNode?.label || rel.source}
                      </span>
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {rel.label || "depends on"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Downstream Dependencies */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Blocks & Feeds Into ({selectedRelations.downstream.length})</span>
                <span className="text-[10px] text-slate-500 font-mono">Downstream Ripple</span>
              </h3>
              {selectedRelations.downstream.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-2 bg-slate-900/50 rounded-lg">No downstream tasks waiting on this</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedRelations.downstream.map((rel, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {rel.connectedNode?.label || rel.target}
                      </span>
                      <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {rel.label || "blocks"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <Link
                href="/impact"
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚡</span>
                <span>Run AI Impact Analysis on this Node</span>
              </Link>
              <Link
                href={`/memory`}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>🔍</span>
                <span>Search History in Project Memory</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function positionNodes(rawNodes: any[], rawEdges: any[]) {
  const typeGroups: Record<string, any[]> = {};
  rawNodes.forEach((n) => {
    const t = n.type || "task";
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(n);
  });

  const nodes: Node[] = [];
  const typeOffsets: Record<string, { x: number; y: number }> = {
    task: { x: 0, y: 0 },
    stakeholder: { x: 900, y: 0 },
    vendor: { x: 900, y: 550 },
    change_request: { x: 450, y: 550 },
  };

  Object.entries(typeGroups).forEach(([type, group]) => {
    const offset = typeOffsets[type] || { x: 0, y: 0 };
    const cols = Math.ceil(Math.sqrt(group.length));

    group.forEach((n, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const borderColor = statusColors[n.status] || "#64748b";

      nodes.push({
        id: n.id,
        position: { x: offset.x + col * 230, y: offset.y + row * 110 },
        data: {
          label: n.label,
          entityType: n.type,
          status: n.status,
          role: n.role,
          metadata: n.metadata,
        },
        style: {
          background: typeColors[type] || "#1e293b",
          border: `2px solid ${borderColor}`,
          borderRadius: "14px",
          padding: "10px 14px",
          color: "#f8fafc",
          fontSize: "12px",
          fontWeight: 600,
          minWidth: "170px",
          maxWidth: "240px",
          boxShadow: `0 0 24px ${borderColor}25`,
          cursor: "pointer",
        },
      });
    });
  });

  const edges: Edge[] = rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    labelStyle: { fill: "#94a3b8", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#0c1222", fillOpacity: 0.9 },
    markerEnd: { type: "arrowclosed" as any, color: "#64748b" },
    style: {
      stroke:
        e.relationship_type === "depends_on"
          ? "#f59e0b"
          : e.relationship_type === "assigned_to"
          ? "#3b82f6"
          : e.relationship_type === "requires_approval"
          ? "#ec4899"
          : "#64748b",
      strokeWidth: 1.5,
    },
  }));

  return { nodes, edges };
}
