import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/services/apiClient";
import type { ConflictGraphResponse, GraphVertex } from "@/types/api";
import { ExamNode } from "@/components/graph/ExamNode";
import { GraphDetailsPanel, ConflictingExamDetail } from "@/components/graph/GraphDetailsPanel";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { computeGraphLayout, LayoutMode } from "@/lib/graphLayout";

import {
  GitFork,
  ArrowClockwise,
  WarningCircle,
  MagnifyingGlass,
  CheckCircle,
  Sparkle,
  BookOpen,
  Users,
  ArrowsLeftRight,
  ArrowsOutCardinal,
  X,
  Funnel,
  Table,
  Eye,
} from "@phosphor-icons/react";

const nodeTypes = {
  examNode: ExamNode,
};

interface InnerCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  selectedVertex: GraphVertex | null;
  conflictingDetails: ConflictingExamDetail[];
  slotsUsed?: number;
}

const ConflictGraphCanvasInner: React.FC<InnerCanvasProps> = ({
  initialNodes,
  initialEdges,
  selectedNodeId,
  onSelectNode,
  selectedVertex,
  conflictingDetails,
  slotsUsed,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, setCenter } = useReactFlow();
  const prevSelectedRef = useRef<string | null>(null);

  // Sync state when initialNodes or initialEdges change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Center on selected node when selection changes
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevSelectedRef.current) {
      const targetNode = initialNodes.find((n) => n.id === selectedNodeId);
      if (targetNode) {
        setCenter(targetNode.position.x + 96, targetNode.position.y + 45, {
          duration: 600,
          zoom: 1.15,
        });
      }
    }
    prevSelectedRef.current = selectedNodeId;
  }, [selectedNodeId, initialNodes, setCenter]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id === selectedNodeId ? null : node.id);
    },
    [onSelectNode, selectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div className="relative w-full h-[640px] rounded-xl border border-border-strong bg-[#0f1115] overflow-hidden shadow-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        attributionPosition="bottom-left"
        className="slotwise-graph-canvas"
      >
        <Background color="#232730" gap={24} size={1.2} />
        <Controls
          showInteractive={false}
          className="!bg-surface !border-border-strong !shadow-card !rounded-lg overflow-hidden [&>button]:!bg-surface [&>button]:!border-border-subtle [&>button]:!text-content-primary [&>button:hover]:!bg-surface-elevated"
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.id === selectedNodeId) return "#F5A64A";
            const isNeigh = conflictingDetails.some((c) => c.neighbor.code === n.id);
            if (isNeigh) return "#69C9B1";
            const v = n.data?.vertex as GraphVertex | undefined;
            if (v && v.degree === 0) return "#4ADE80";
            return "#374151";
          }}
          maskColor="rgba(15, 17, 21, 0.75)"
          className="!bg-[#111318] !border-border-strong !rounded-lg !shadow-subtle"
        />
      </ReactFlow>

      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-10 max-w-xs">
        <GraphLegend slotsUsed={slotsUsed} />
      </div>

      {/* Floating Fit View Quick Action */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          leftIcon={<ArrowsOutCardinal size={13} />}
          className="bg-surface/90 backdrop-blur-md shadow-subtle text-xs"
        >
          Fit View
        </Button>
      </div>

      {/* Selected Node Details Drawer / Overlay */}
      {selectedVertex && (
        <div className="absolute top-4 right-4 bottom-4 z-20 flex flex-col justify-start">
          <GraphDetailsPanel
            selectedVertex={selectedVertex}
            conflictingExams={conflictingDetails}
            onClose={() => onSelectNode(null)}
            onSelectNeighbor={(code) => onSelectNode(code)}
          />
        </div>
      )}
    </div>
  );
};

export interface ConflictGraphPageProps {
  initialSlotAssignments?: Record<string, number> | null;
  initialSlotsUsed?: number;
  hideHeader?: boolean;
}

export const ConflictGraphPage: React.FC<ConflictGraphPageProps> = ({
  initialSlotAssignments,
  initialSlotsUsed,
  hideHeader = false,
}) => {
  const [data, setData] = useState<ConflictGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, number> | null>(
    initialSlotAssignments || null
  );

  // Filters & layout state
  const [viewMode, setViewMode] = useState<"canvas" | "table">("canvas");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "conflicts" | "isolated" | "hubs">("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("concentric");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vertices" | "edges">("vertices");

  useEffect(() => {
    if (initialSlotAssignments !== undefined) {
      setSlotAssignments(initialSlotAssignments);
    }
  }, [initialSlotAssignments]);

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.graph.getConflicts();
      setData(res);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Failed to load conflict graph from backend.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Derived graph properties
  const vertices = useMemo(() => data?.vertices || [], [data]);
  const edges = useMemo(() => data?.edges || [], [data]);
  const vertexCount = vertices.length;
  const edgeCount = edges.length;

  const isolatedVertices = useMemo(() => vertices.filter((v) => v.degree === 0), [vertices]);
  const conflictedVertices = useMemo(() => vertices.filter((v) => v.degree > 0), [vertices]);
  const hubVertices = useMemo(() => vertices.filter((v) => v.degree >= 3), [vertices]);
  const maxDegree = useMemo(
    () => (vertices.length > 0 ? Math.max(...vertices.map((v) => v.degree)) : 0),
    [vertices]
  );
  const density = useMemo(
    () => (vertexCount > 1 ? ((2 * edgeCount) / (vertexCount * (vertexCount - 1))) * 100 : 0),
    [vertexCount, edgeCount]
  );

  // Currently selected vertex object and conflicting details
  const selectedVertex = useMemo(
    () => (selectedNodeId ? vertices.find((v) => v.code === selectedNodeId) || null : null),
    [selectedNodeId, vertices]
  );

  const conflictingDetails: ConflictingExamDetail[] = useMemo(() => {
    if (!selectedVertex) return [];
    const details: ConflictingExamDetail[] = [];
    for (const e of edges) {
      if (e.source === selectedVertex.code || e.target === selectedVertex.code) {
        const neighborCode = e.source === selectedVertex.code ? e.target : e.source;
        const neighborObj = vertices.find((v) => v.code === neighborCode);
        if (neighborObj) {
          details.push({
            neighbor: neighborObj,
            weight: e.weight,
            sharedStudents: e.shared_students,
          });
        }
      }
    }
    // Sort conflicting exams by weight descending, then code
    return details.sort((a, b) => b.weight - a.weight || a.neighbor.code.localeCompare(b.neighbor.code));
  }, [selectedVertex, edges, vertices]);

  // Compute Layout Result with optional slotAssignments
  const layoutResult = useMemo(() => {
    return computeGraphLayout(vertices, edges, {
      mode: layoutMode,
      selectedNodeId,
      searchTerm,
      filterMode,
      slotAssignments,
    });
  }, [vertices, edges, layoutMode, selectedNodeId, searchTerm, filterMode, slotAssignments]);

  // Filtered views for tabular mode
  const filteredVertices = useMemo(
    () =>
      vertices.filter(
        (v) =>
          v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [vertices, searchTerm]
  );

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          e.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.shared_students.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [edges, searchTerm]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8" data-testid="conflict-graph-page">
      {/* Top Header */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-content-primary tracking-tight">
                Conflict Graph Explorer
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
                Interactive G=(V,E)
              </span>
            </div>
            <p className="text-sm text-content-secondary mt-1">
              Visual conflict representation where examinations are vertices and shared student enrolments form edges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex p-0.5 bg-surface-elevated rounded-lg border border-border-subtle">
              <button
                type="button"
                onClick={() => setViewMode("canvas")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "canvas"
                    ? "bg-surface text-accent-amber font-semibold shadow-subtle border border-border-subtle"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                <Eye size={14} />
                <span>Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-surface text-accent-amber font-semibold shadow-subtle border border-border-subtle"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                <Table size={14} />
                <span>Matrix</span>
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchGraph}
              disabled={isLoading}
              leftIcon={<ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-accent-danger/10 border border-accent-danger/20 p-4 flex items-center justify-between gap-3 text-accent-danger">
          <div className="flex items-center gap-2 text-sm">
            <WarningCircle size={18} weight="bold" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchGraph}>
            Retry
          </Button>
        </div>
      )}

      {/* Zero Conflict State Banner (when exams exist but 0 edges) */}
      {!isLoading && vertexCount > 0 && edgeCount === 0 && (
        <div className="rounded-lg bg-status-success/10 border border-status-success/20 p-4 flex items-start gap-3">
          <CheckCircle size={20} weight="bold" className="text-status-success shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-semibold text-status-success">Zero Conflict Invariant Detected</h4>
            <p className="text-content-secondary mt-0.5 leading-relaxed">
              Every course in the institution currently has disjoint student enrolments. The chromatic number{" "}
              <span className="font-mono font-semibold text-status-success">χ(G) = 1</span>; all examinations could
              theoretically be scheduled concurrently in a single slot without student clashing.
            </p>
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Vertices |V|</span>
              <BookOpen size={16} />
            </div>
            <div className="text-2xl font-bold text-content-primary mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-12" /> : vertexCount}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Course nodes</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Edges |E|</span>
              <ArrowsLeftRight size={16} />
            </div>
            <div className="text-2xl font-bold text-accent-amber mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-12" /> : edgeCount}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Conflict pairs</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Conflicted</span>
              <WarningCircle size={16} />
            </div>
            <div className="text-2xl font-bold text-content-primary mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-10" /> : conflictedVertices.length}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Degree ≥ 1</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Isolated</span>
              <CheckCircle size={16} />
            </div>
            <div className="text-2xl font-bold text-accent-teal mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-10" /> : isolatedVertices.length}
            </div>
            <p className="text-[11px] text-content-muted mt-1">d(v) = 0</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Max Degree Δ</span>
              <Users size={16} />
            </div>
            <div className="text-2xl font-bold text-accent-amber mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-10" /> : maxDegree}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Highest clash degree</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Density</span>
              <GitFork size={16} />
            </div>
            <div className="text-2xl font-bold text-content-primary mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-12" /> : `${density.toFixed(1)}%`}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Graph connectivity</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-8 border border-border-strong rounded-xl bg-surface space-y-4">
          <Skeleton variant="rectangular" className="h-8 w-64" />
          <Skeleton variant="rectangular" className="h-96 w-full" />
        </div>
      ) : vertexCount === 0 ? (
        /* Empty Graph State */
        <Card variant="default">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-surface border border-border-strong flex items-center justify-center text-content-muted mx-auto">
              <GitFork size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-content-primary">
                Conflict Graph is Empty
              </h3>
              <p className="text-xs text-content-secondary mt-1.5 max-w-md mx-auto leading-relaxed">
                No examinations or course enrolments currently exist in the database. Add courses or import a sample university academic dataset from the Overview studio to initialize the conflict graph.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/app">
                <Button variant="secondary" size="sm" leftIcon={<Sparkle size={14} />}>
                  Load Sample Dataset in Overview
                </Button>
              </Link>
              <Link to="/app/examinations">
                <Button variant="primary" size="sm" leftIcon={<BookOpen size={14} />}>
                  Add Examinations
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Interactive Graph Canvas Explorer */}
          <div className="space-y-3">
            {/* Canvas Controls Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-surface border border-border-strong rounded-xl">
              {/* Search Input */}
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
                />
                <input
                  type="text"
                  placeholder="Search course code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs bg-surface-elevated border border-border-strong text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent-amber"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-content-muted font-mono mr-1 flex items-center gap-1">
                  <Funnel size={12} />
                  <span>Filter:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterMode === "all"
                      ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/40"
                      : "bg-surface-elevated text-content-secondary hover:text-content-primary border border-border-subtle"
                  }`}
                >
                  All ({vertices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("conflicts")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterMode === "conflicts"
                      ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/40"
                      : "bg-surface-elevated text-content-secondary hover:text-content-primary border border-border-subtle"
                  }`}
                >
                  Conflicted ({conflictedVertices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("isolated")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterMode === "isolated"
                      ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/40"
                      : "bg-surface-elevated text-content-secondary hover:text-content-primary border border-border-subtle"
                  }`}
                >
                  Isolated ({isolatedVertices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("hubs")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterMode === "hubs"
                      ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/40"
                      : "bg-surface-elevated text-content-secondary hover:text-content-primary border border-border-subtle"
                  }`}
                >
                  Hubs d≥3 ({hubVertices.length})
                </button>
              </div>

              {/* Layout Mode Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-content-muted font-mono mr-1">Layout:</span>
                <div className="flex p-0.5 bg-surface-elevated rounded-md border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setLayoutMode("concentric")}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      layoutMode === "concentric"
                        ? "bg-surface text-content-primary shadow-xs font-semibold"
                        : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    Concentric
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("circle")}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      layoutMode === "circle"
                        ? "bg-surface text-content-primary shadow-xs font-semibold"
                        : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    Circular
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("grid")}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      layoutMode === "grid"
                        ? "bg-surface text-content-primary shadow-xs font-semibold"
                        : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Component with Provider */}
            <ReactFlowProvider>
              <ConflictGraphCanvasInner
                initialNodes={layoutResult.nodes}
                initialEdges={layoutResult.edges}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                selectedVertex={selectedVertex}
                conflictingDetails={conflictingDetails}
                slotsUsed={initialSlotsUsed}
              />
            </ReactFlowProvider>

            {/* Graph Summary Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 text-xs text-content-muted">
              <div>
                Showing{" "}
                <span className="font-mono font-semibold text-content-primary">
                  {layoutResult.visibleVertexCount}
                </span>{" "}
                courses and{" "}
                <span className="font-mono font-semibold text-content-primary">
                  {layoutResult.visibleEdgeCount}
                </span>{" "}
                conflict edges under current filter.
              </div>
              <div className="text-[11px]">
                Click any node to inspect conflicts; click empty canvas to deselect.
              </div>
            </div>
          </div>

          {/* Section 2: Tabular Conflict Matrix */}
          <Card variant="default">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle p-4">
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 bg-surface-elevated rounded-md border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setActiveTab("vertices")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeTab === "vertices"
                        ? "bg-surface text-content-primary shadow-subtle font-semibold"
                        : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    Vertices & Adjacency ({vertices.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("edges")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeTab === "edges"
                        ? "bg-surface text-content-primary shadow-subtle font-semibold"
                        : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    Conflict Edges ({edges.length})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {activeTab === "vertices" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-elevated/50 text-content-muted uppercase tracking-wider font-mono border-b border-border-subtle">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Vertex (Course)</th>
                        <th className="py-2.5 px-4 font-medium">Course Name</th>
                        <th className="py-2.5 px-4 font-medium text-center">Degree d(v)</th>
                        <th className="py-2.5 px-4 font-medium">Status</th>
                        <th className="py-2.5 px-4 font-medium">Adjacency (Conflicting Courses)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredVertices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-content-muted">
                            No vertices match "{searchTerm}".
                          </td>
                        </tr>
                      ) : (
                        filteredVertices.map((v) => {
                          const neighbors = edges
                            .filter((e) => e.source === v.code || e.target === v.code)
                            .map((e) => (e.source === v.code ? e.target : e.source));

                          return (
                            <tr key={v.code} className="hover:bg-surface-elevated/40">
                              <td className="py-3 px-4 font-mono font-bold text-accent-amber">
                                {v.code}
                              </td>
                              <td className="py-3 px-4 text-content-primary">{v.name}</td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded font-mono font-semibold ${
                                    v.degree === 0
                                      ? "bg-accent-teal/10 text-accent-teal"
                                      : v.degree >= 3
                                      ? "bg-accent-amber/15 text-accent-amber font-bold"
                                      : "bg-surface-elevated text-content-primary"
                                  }`}
                                >
                                  {v.degree}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {v.degree === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-accent-teal">
                                    <CheckCircle size={13} weight="bold" />
                                    Isolated (Slot-Free)
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-content-secondary">
                                    {v.degree} clash{v.degree === 1 ? "" : "es"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {neighbors.length === 0 ? (
                                  <span className="text-content-muted italic">None</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-w-md">
                                    {neighbors.map((nb) => (
                                      <span
                                        key={nb}
                                        className="px-1.5 py-0.5 rounded bg-surface border border-border-subtle font-mono text-[10px] text-content-secondary"
                                      >
                                        {nb}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-elevated/50 text-content-muted uppercase tracking-wider font-mono border-b border-border-subtle">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Exam A</th>
                        <th className="py-2.5 px-4 font-medium">Exam B</th>
                        <th className="py-2.5 px-4 font-medium text-center">Conflict Weight (Students)</th>
                        <th className="py-2.5 px-4 font-medium">Shared Student IDs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredEdges.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-content-muted">
                            {edges.length === 0
                              ? "No conflict edges in current graph (all courses are conflict-free)."
                              : `No edges match "${searchTerm}".`}
                          </td>
                        </tr>
                      ) : (
                        filteredEdges.map((e, idx) => (
                          <tr key={idx} className="hover:bg-surface-elevated/40">
                            <td className="py-3 px-4 font-mono font-bold text-accent-amber">
                              {e.source}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-accent-amber">
                              {e.target}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-mono font-bold">
                                {e.weight} student{e.weight === 1 ? "" : "s"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {e.shared_students.slice(0, 8).map((stu) => (
                                  <span
                                    key={stu}
                                    className="px-1.5 py-0.5 rounded bg-surface border border-border-subtle font-mono text-[10px] text-content-secondary"
                                  >
                                    {stu}
                                  </span>
                                ))}
                                {e.shared_students.length > 8 && (
                                  <span className="text-[10px] text-content-muted font-mono self-center">
                                    +{e.shared_students.length - 8} more
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
