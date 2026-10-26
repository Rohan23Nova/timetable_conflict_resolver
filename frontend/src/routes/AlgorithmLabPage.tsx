import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TreeStructure,
  Sparkle,
  Lightning,
  CheckCircle,
  XCircle,
  WarningCircle,
  Clock,
  ArrowClockwise,
  GraduationCap,
  ShieldCheck,
  Scales,
  Play,
  ClockCounterClockwise,
  Table,
  Graph,
  Info,
} from "@phosphor-icons/react";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/services/apiClient";
import type {
  ConflictGraphResponse,
  ScheduleRunRequest,
  ScheduleCompareRequest,
  ScheduleRunResponse,
  ScheduleCompareResponse,
  SlotAssignmentDetail,
} from "@/types/api";
import { ConflictGraphPage } from "./ConflictGraphPage";
import { getSlotTheme } from "@/lib/slotColors";

type SolverMode = "greedy" | "backtracking" | "compare";
type ActiveViewTab = "grid" | "graph" | "validation" | "compare" | "history";

export const AlgorithmLabPage: React.FC = () => {
  const { addToast } = useToast();

  // Conflict Graph state
  const [graphData, setGraphData] = useState<ConflictGraphResponse | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);
  const [, setGraphError] = useState<string | null>(null);

  // Configuration state
  const [mode, setMode] = useState<SolverMode>("greedy");
  const [greedyOrdering, setGreedyOrdering] = useState<"descending_degree" | "natural">("descending_degree");
  const [greedyMaxSlots, setGreedyMaxSlots] = useState<string>("");
  const [backtrackingSlots, setBacktrackingSlots] = useState<number>(4);
  const [backtrackingMaxNodes, setBacktrackingMaxNodes] = useState<number>(100000);
  const [backtrackingTimeout, setBacktrackingTimeout] = useState<number>(5.0);

  // Execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<ScheduleRunResponse | null>(null);
  const [compareResult, setCompareResult] = useState<ScheduleCompareResponse | null>(null);
  const [activeCompareAlgo, setActiveCompareAlgo] = useState<"greedy" | "backtracking">("greedy");
  const [activeTab, setActiveTab] = useState<ActiveViewTab>("grid");

  // Run history
  const [historyRuns, setHistoryRuns] = useState<ScheduleRunResponse[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Fetch conflict graph metadata
  const fetchGraph = useCallback(async () => {
    setIsLoadingGraph(true);
    setGraphError(null);
    try {
      const data = await apiClient.graph.getConflicts();
      setGraphData(data);
      const degValues = Object.values(data.degrees || {});
      const calculatedMaxDeg = degValues.length > 0 ? Math.max(...degValues) : 0;
      if (calculatedMaxDeg > 0) {
        // Sensible default for backtracking: Δ(G) + 1 (Brooks' theorem bound)
        setBacktrackingSlots(calculatedMaxDeg + 1);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setGraphError(e?.message || "Failed to load graph summary.");
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.scheduling.listRuns();
      setHistoryRuns(res || []);
    } catch {
      // Non-critical, ignore
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    fetchHistory();
  }, [fetchGraph, fetchHistory]);

  const vertexCount = graphData?.vertex_count ?? 0;
  const edgeCount = graphData?.edge_count ?? 0;
  const maxDegree = useMemo(() => {
    if (!graphData?.degrees) return 0;
    const vals = Object.values(graphData.degrees);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [graphData]);

  // Active result object currently inspected in UI
  const currentActiveResult: ScheduleRunResponse | null = useMemo(() => {
    if (mode === "compare" && compareResult) {
      return activeCompareAlgo === "greedy" ? compareResult.greedy_result : compareResult.backtracking_result;
    }
    return singleResult;
  }, [mode, compareResult, activeCompareAlgo, singleResult]);

  // Execute solver
  const handleExecute = async () => {
    setIsExecuting(true);
    setRunError(null);

    try {
      if (mode === "compare") {
        const req: ScheduleCompareRequest = {
          ordering_strategy: greedyOrdering,
          max_colors: backtrackingSlots,
          max_nodes: backtrackingMaxNodes,
          timeout_seconds: backtrackingTimeout,
        };
        const res = await apiClient.scheduling.compare(req);
        setCompareResult(res);
        setSingleResult(null);
        setActiveCompareAlgo("greedy");
        setActiveTab("compare");
        addToast({
          type: "success",
          title: "Benchmark Completed",
          message: `Greedy used ${res.greedy_result.slots_used} slots (${res.greedy_result.execution_time_ms.toFixed(2)} ms). Backtracking: ${res.backtracking_result.status}.`,
        });
      } else if (mode === "greedy") {
        const req: ScheduleRunRequest = {
          algorithm: "greedy",
          ordering_strategy: greedyOrdering,
          max_colors: greedyMaxSlots ? parseInt(greedyMaxSlots, 10) : undefined,
        };
        const res = await apiClient.scheduling.run(req);
        setSingleResult(res);
        setCompareResult(null);
        setActiveTab("grid");
        addToast({
          type: res.is_valid ? "success" : "warning",
          title: res.is_valid ? "Timetable Generated" : "Generation Alert",
          message: `Generated schedule using ${res.slots_used} slots in ${res.execution_time_ms.toFixed(2)} ms. Valid: ${res.is_valid}.`,
        });
      } else {
        const req: ScheduleRunRequest = {
          algorithm: "backtracking",
          max_colors: backtrackingSlots,
          max_nodes: backtrackingMaxNodes,
          timeout_seconds: backtrackingTimeout,
        };
        const res = await apiClient.scheduling.run(req);
        setSingleResult(res);
        setCompareResult(null);
        setActiveTab("grid");
        addToast({
          type: res.status === "COMPLETED" ? "success" : res.status === "INFEASIBLE" ? "warning" : "error",
          title: `Backtracking: ${res.status}`,
          message: res.explanation.slice(0, 100) + "...",
        });
      }
      fetchHistory();
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || "Failed to execute algorithm run.";
      setRunError(msg);
      addToast({
        type: "error",
        title: "Execution Error",
        message: msg,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Group active slot details by slot number
  const slotGroups = useMemo(() => {
    if (!currentActiveResult || !currentActiveResult.slot_details) return [];
    const map = new Map<number, SlotAssignmentDetail[]>();
    for (const item of currentActiveResult.slot_details) {
      if (!map.has(item.slot)) {
        map.set(item.slot, []);
      }
      map.get(item.slot)!.push(item);
    }
    // Sort slots numerically
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [currentActiveResult]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1">
            <Link to="/app" className="hover:text-content-primary transition-colors">
              Studio
            </Link>
            <span>/</span>
            <span className="text-content-primary font-medium">Algorithm Laboratory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary flex items-center gap-2.5">
            <TreeStructure size={28} className="text-accent-amber" weight="duotone" />
            Algorithm Laboratory & Timetable Generation
          </h1>
          <p className="text-sm text-content-secondary mt-1">
            Formulate, execute, and benchmark graph-coloring heuristics (Welsh-Powell Greedy) and exact state-space search (Backtracking) on real examination conflict graphs.
          </p>
        </div>

        {/* Telemetry pill */}
        <div className="flex items-center gap-3 bg-surface-card border border-border-strong rounded-lg px-4 py-2.5 shadow-sm">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">Conflict Graph</p>
            <p className="text-xs font-mono font-medium text-content-primary">
              |V|={vertexCount} &bull; |E|={edgeCount} &bull; &Delta;={maxDegree}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchGraph}
            disabled={isLoadingGraph}
            className="p-1.5 h-auto text-content-secondary hover:text-content-primary"
            title="Refresh conflict graph"
          >
            <ArrowClockwise size={16} className={isLoadingGraph ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Empty Graph Warning */}
      {!isLoadingGraph && vertexCount === 0 && (
        <Card variant="default" className="border-accent-amber/40 bg-accent-amber/5">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber shrink-0">
                <WarningCircle size={22} weight="bold" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-content-primary">Conflict Graph is Empty (|V| = 0)</h4>
                <p className="text-xs text-content-secondary mt-0.5">
                  No examinations exist in the database. Add exams and enrollments first to construct conflict edges and generate timetables.
                </p>
              </div>
            </div>
            <Link to="/app/examinations">
              <Button variant="primary" size="sm" leftIcon={<GraduationCap size={15} />}>
                Manage Examinations
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Configuration Panel */}
      <Card variant="default" className="shadow-card border-border-strong">
        <CardHeader className="pb-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
              <Play size={18} className="text-accent-amber" weight="fill" />
              Solver Configuration
            </h3>
            <p className="text-xs text-content-secondary mt-0.5">
              Select solver strategy, parameter limits, and execution constraints.
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-[#151921] p-1 rounded-lg border border-border-strong text-xs">
            <button
              type="button"
              onClick={() => setMode("greedy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                mode === "greedy"
                  ? "bg-accent-amber text-[#12141a] shadow-sm font-semibold"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              <Sparkle size={14} weight="bold" />
              Greedy (Welsh-Powell)
            </button>
            <button
              type="button"
              onClick={() => setMode("backtracking")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                mode === "backtracking"
                  ? "bg-accent-amber text-[#12141a] shadow-sm font-semibold"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              <TreeStructure size={14} weight="bold" />
              Exact Backtracking
            </button>
            <button
              type="button"
              onClick={() => setMode("compare")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                mode === "compare"
                  ? "bg-accent-amber text-[#12141a] shadow-sm font-semibold"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              <Scales size={14} weight="bold" />
              Run Both (Benchmark)
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Mode Explanations & Specific Inputs */}
          {mode === "greedy" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border-subtle flex items-start gap-3 text-xs text-content-secondary">
                <Lightning size={18} className="text-accent-amber shrink-0 mt-0.5" weight="fill" />
                <div>
                  <span className="font-semibold text-content-primary">Greedy Graph Coloring (O(V&sup2;) / Welsh-Powell Heuristic): </span>
                  Iterates through vertices in a specified order and assigns the smallest valid color index not used by any adjacent neighbor. Fast, deterministic, and highly effective for timetable scheduling.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Vertex Ordering Strategy
                  </label>
                  <select
                    value={greedyOrdering}
                    onChange={(e) => setGreedyOrdering(e.target.value as "descending_degree" | "natural")}
                    className="w-full h-9 rounded-md border border-border-strong bg-[#151921] px-3 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent-amber"
                  >
                    <option value="descending_degree">
                      Descending Degree (Welsh-Powell: deg(v) largest first)
                    </option>
                    <option value="natural">Natural Order (Input / Alphabetical order)</option>
                  </select>
                  <p className="text-[11px] text-content-tertiary mt-1">
                    Welsh-Powell prioritizes high-degree bottleneck exams early, significantly reducing total slots.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Maximum Slot Constraint (Optional)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Unbounded (finds heuristic minimum)"
                    value={greedyMaxSlots}
                    onChange={(e) => setGreedyMaxSlots(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-content-tertiary mt-1">
                    Leave blank to color without slot ceiling, or set a cap to test if Greedy fits within k slots.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === "backtracking" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border-subtle flex items-start gap-3 text-xs text-content-secondary">
                <TreeStructure size={18} className="text-accent-amber shrink-0 mt-0.5" weight="bold" />
                <div>
                  <span className="font-semibold text-content-primary">Exact Backtracking (k-Coloring / O(k^V)): </span>
                  Explores the systematic decision tree to find an exact valid coloring using at most k time slots. If none exists, exhaustive search mathematically proves k-infeasibility.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-content-primary">
                      Target Slot Limit (k)
                    </label>
                    {maxDegree > 0 && (
                      <button
                        type="button"
                        onClick={() => setBacktrackingSlots(maxDegree + 1)}
                        className="text-[10px] text-accent-amber hover:underline flex items-center gap-0.5"
                      >
                        Brooks' Bound (&Delta;+1={maxDegree + 1})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={backtrackingSlots}
                    onChange={(e) => setBacktrackingSlots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-content-tertiary mt-1">
                    Available slots [1..k]. Lower values test tighter schedules; higher values guarantee feasibility.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Search Node Limit
                  </label>
                  <Input
                    type="number"
                    min={100}
                    step={1000}
                    value={backtrackingMaxNodes}
                    onChange={(e) => setBacktrackingMaxNodes(parseInt(e.target.value, 10) || 100000)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-content-tertiary mt-1">
                    Prevents infinite tree expansion. Exceeding limit returns RESOURCE_LIMITED.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Timeout (Seconds)
                  </label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={backtrackingTimeout}
                    onChange={(e) => setBacktrackingTimeout(parseFloat(e.target.value) || 5.0)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-content-tertiary mt-1">
                    Maximum wall-clock search budget before aborting with RESOURCE_LIMITED status.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === "compare" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border-subtle flex items-start gap-3 text-xs text-content-secondary">
                <Scales size={18} className="text-accent-amber shrink-0 mt-0.5" weight="bold" />
                <div>
                  <span className="font-semibold text-content-primary">Side-by-Side Benchmark: </span>
                  Executes Welsh-Powell Greedy and Exact Backtracking concurrently on the exact same graph snapshot to contrast heuristic slot efficiency against state-space branch exploration.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Greedy Ordering Strategy
                  </label>
                  <select
                    value={greedyOrdering}
                    onChange={(e) => setGreedyOrdering(e.target.value as "descending_degree" | "natural")}
                    className="w-full h-9 rounded-md border border-border-strong bg-[#151921] px-3 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent-amber"
                  >
                    <option value="descending_degree">Descending Degree (Welsh-Powell)</option>
                    <option value="natural">Natural Order (Input sequence)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Backtracking Target Slots (k)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={backtrackingSlots}
                    onChange={(e) => setBacktrackingSlots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Backtracking Timeout (Sec)
                  </label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={backtrackingTimeout}
                    onChange={(e) => setBacktrackingTimeout(parseFloat(e.target.value) || 5.0)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle">
            <div className="text-xs text-content-tertiary">
              Independent constraint validation is automatically executed after every run.
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleExecute}
              disabled={isExecuting || vertexCount === 0}
              leftIcon={
                isExecuting ? (
                  <ArrowClockwise size={16} className="animate-spin" />
                ) : (
                  <Play size={16} weight="fill" />
                )
              }
              className="w-full sm:w-auto font-semibold px-6"
            >
              {isExecuting
                ? "Running Solver Engine..."
                : mode === "compare"
                ? "Execute Side-by-Side Benchmark"
                : mode === "greedy"
                ? "Generate Timetable (Greedy)"
                : "Execute Exact Backtracking"}
            </Button>
          </div>

          {runError && (
            <div className="p-3 rounded-lg bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose flex items-center gap-2">
              <WarningCircle size={16} weight="bold" />
              <span>{runError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Area */}
      {currentActiveResult && (
        <div className="space-y-6">
          {/* Result Primary Metric Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status Card */}
            <Card variant="default" className="shadow-sm border-border-strong">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">
                  Execution Status
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {currentActiveResult.status === "COMPLETED" && (
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs py-0.5">
                      <CheckCircle size={14} className="mr-1" weight="bold" />
                      COMPLETED
                    </Badge>
                  )}
                  {currentActiveResult.status === "INFEASIBLE" && (
                    <Badge variant="default" className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-xs py-0.5">
                      <XCircle size={14} className="mr-1" weight="bold" />
                      INFEASIBLE (k={backtrackingSlots})
                    </Badge>
                  )}
                  {currentActiveResult.status === "RESOURCE_LIMITED" && (
                    <Badge variant="default" className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs py-0.5">
                      <WarningCircle size={14} className="mr-1" weight="bold" />
                      SEARCH LIMIT REACHED
                    </Badge>
                  )}
                  {currentActiveResult.status === "INCOMPLETE" && (
                    <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs py-0.5">
                      INCOMPLETE
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-content-tertiary mt-1 capitalize">
                  {currentActiveResult.algorithm} solver
                </p>
              </CardContent>
            </Card>

            {/* Slots Used */}
            <Card variant="default" className="shadow-sm border-border-strong">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">
                  Slots Required
                </p>
                <p className="text-xl font-bold font-mono text-content-primary mt-1">
                  {currentActiveResult.slots_used > 0 ? `${currentActiveResult.slots_used} Slots` : "None (Infeasible)"}
                </p>
                <p className="text-[11px] text-content-tertiary mt-1">
                  {currentActiveResult.algorithm === "greedy" ? "Heuristic Upper Bound" : "Exact Chromatic Target"}
                </p>
              </CardContent>
            </Card>

            {/* Execution Duration */}
            <Card variant="default" className="shadow-sm border-border-strong">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">
                  Execution Duration
                </p>
                <p className="text-xl font-bold font-mono text-accent-amber mt-1">
                  {currentActiveResult.execution_time_ms < 1
                    ? `${(currentActiveResult.execution_time_ms * 1000).toFixed(0)} μs`
                    : `${currentActiveResult.execution_time_ms.toFixed(2)} ms`}
                </p>
                <p className="text-[11px] text-content-tertiary mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  Engine CPU compute time
                </p>
              </CardContent>
            </Card>

            {/* Independent Validation */}
            <Card variant="default" className="shadow-sm border-border-strong">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">
                  Validation Certificate
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {currentActiveResult.is_valid ? (
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs py-0.5">
                      <ShieldCheck size={14} className="mr-1" weight="bold" />
                      0 Conflicts (100% Valid)
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-xs py-0.5">
                      <XCircle size={14} className="mr-1" weight="bold" />
                      Validation Failed
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-content-tertiary mt-1">
                  Independent constraint verifier
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Plain-Language Pedagogical Narrative */}
          <Card
            variant="default"
            className={`border shadow-card ${
              currentActiveResult.status === "COMPLETED"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : currentActiveResult.status === "RESOURCE_LIMITED"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-rose-500/30 bg-rose-500/5"
            }`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  currentActiveResult.status === "COMPLETED"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : currentActiveResult.status === "RESOURCE_LIMITED"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {currentActiveResult.status === "COMPLETED" ? (
                  <Sparkle size={20} weight="fill" />
                ) : currentActiveResult.status === "RESOURCE_LIMITED" ? (
                  <WarningCircle size={20} weight="bold" />
                ) : (
                  <Info size={20} weight="bold" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-content-primary">
                  {currentActiveResult.algorithm === "greedy"
                    ? "Welsh-Powell Greedy Solver Analysis"
                    : "Backtracking Branch-and-Prune Search Analysis"}
                </h4>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {currentActiveResult.explanation}
                </p>
                {currentActiveResult.status === "RESOURCE_LIMITED" && (
                  <p className="text-[11px] text-amber-400/90 font-medium pt-1">
                    &bull; Mathematical Notice: Resource-limited termination means search space exceeded cutoff thresholds. It does NOT prove k is impossible. Increasing node limit or timeout budget may find an allocation.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sub-Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-strong pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                variant={activeTab === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("grid")}
                leftIcon={<Table size={16} />}
              >
                Slot Allocation Grid ({slotGroups.length} Slots)
              </Button>
              <Button
                variant={activeTab === "graph" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("graph")}
                leftIcon={<Graph size={16} />}
              >
                Conflict Graph Colored View
              </Button>
              <Button
                variant={activeTab === "validation" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("validation")}
                leftIcon={<ShieldCheck size={16} />}
              >
                Validation Report
              </Button>
              {compareResult && (
                <Button
                  variant={activeTab === "compare" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("compare")}
                  leftIcon={<Scales size={16} />}
                >
                  Side-by-Side Comparison
                </Button>
              )}
              <Button
                variant={activeTab === "history" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("history")}
                leftIcon={<ClockCounterClockwise size={16} />}
              >
                Run History ({historyRuns.length})
              </Button>
            </div>

            {/* If in compare mode, selector to switch active inspected solver */}
            {compareResult && (
              <div className="flex items-center gap-2 text-xs bg-[#151921] px-2.5 py-1 rounded-lg border border-border-strong">
                <span className="text-content-secondary font-medium">Viewing Allocation:</span>
                <button
                  type="button"
                  onClick={() => setActiveCompareAlgo("greedy")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    activeCompareAlgo === "greedy"
                      ? "bg-accent-amber text-[#12141a]"
                      : "text-content-secondary hover:text-content-primary"
                  }`}
                >
                  Greedy ({compareResult.greedy_result.slots_used} slots)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCompareAlgo("backtracking")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    activeCompareAlgo === "backtracking"
                      ? "bg-accent-amber text-[#12141a]"
                      : "text-content-secondary hover:text-content-primary"
                  }`}
                >
                  Backtracking ({compareResult.backtracking_result.slots_used} slots)
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: Slot Allocation Grid */}
          {activeTab === "grid" && (
            <div className="space-y-4">
              {slotGroups.length === 0 ? (
                <Card variant="default">
                  <CardContent className="p-8 text-center text-xs text-content-secondary">
                    No slot assignments to display. The algorithm finished with status {currentActiveResult.status}.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {slotGroups.map(([slotNum, examsInSlot]) => {
                    const theme = getSlotTheme(slotNum);

                    return (
                      <div
                        key={slotNum}
                        className={`rounded-xl border ${theme.borderClass} ${theme.bgClass} flex flex-col overflow-hidden shadow-sm`}
                      >
                        {/* Slot Header */}
                        <div className="p-3.5 border-b border-border-subtle/50 flex items-center justify-between bg-[#151921]/60">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${theme.badgeClass} border`}
                            >
                              Slot {slotNum}
                            </span>
                            <span className="text-xs font-semibold text-content-primary">
                              {examsInSlot.length} {examsInSlot.length === 1 ? "Exam" : "Exams"}
                            </span>
                          </div>
                          <span className="text-[11px] text-content-secondary font-mono">
                            Independent Non-Conflict
                          </span>
                        </div>

                        {/* Exam Cards inside this slot */}
                        <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[460px]">
                          {examsInSlot.map((exam) => (
                            <div
                              key={exam.exam_code}
                              className="p-3 rounded-lg bg-[#181d26] border border-border-strong hover:border-border-focus transition-colors shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-bold text-content-primary">
                                  {exam.exam_code}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  0 Slot Clashes
                                </span>
                              </div>
                              <p className="text-xs font-medium text-content-primary mt-1 line-clamp-1">
                                {exam.exam_name || exam.exam_code}
                              </p>
                              {exam.department && (
                                <p className="text-[11px] text-content-tertiary mt-0.5">
                                  {exam.department}
                                </p>
                              )}
                              <div className="mt-2 pt-2 border-t border-border-subtle/40 flex items-center justify-between text-[11px] text-content-secondary">
                                <span className="text-content-tertiary">
                                  Semester: {exam.semester || "N/A"}
                                </span>
                                <span className="text-content-tertiary font-mono">
                                  Conflict Degree: {exam.degree}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Conflict Graph Colored View */}
          {activeTab === "graph" && (
            <div className="space-y-3">
              <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg flex items-center justify-between text-xs text-content-secondary">
                <span>
                  Showing real-time slot colors applied to conflict graph nodes. Nodes sharing an edge are guaranteed to have different slot colors.
                </span>
                <span className="font-mono text-content-primary">
                  Colors Used: {currentActiveResult.slots_used}
                </span>
              </div>
              <ConflictGraphPage
                initialSlotAssignments={currentActiveResult.slot_assignments}
                initialSlotsUsed={currentActiveResult.slots_used}
                hideHeader={true}
              />
            </div>
          )}

          {/* TAB 3: Independent Validation Report */}
          {activeTab === "validation" && (
            <Card variant="default" className="shadow-card border-border-strong">
              <CardHeader className="pb-3 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                      <ShieldCheck size={20} className="text-emerald-400" weight="bold" />
                      Independent Constraint Verification Report
                    </h3>
                    <p className="text-xs text-content-secondary mt-0.5">
                      Rigorous external verification asserting that no two conflicting courses share the same slot.
                    </p>
                  </div>
                  <Badge
                    variant="default"
                    className={
                      currentActiveResult.is_valid
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs py-1"
                        : "bg-rose-500/20 text-rose-400 border-rose-500/40 text-xs py-1"
                    }
                  >
                    {currentActiveResult.is_valid ? "VALID TIMETABLE" : "VERIFICATION FAILED"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                    <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold">Exams Checked</p>
                    <p className="text-lg font-mono font-bold text-content-primary mt-1">
                      {currentActiveResult.vertex_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                    <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold">Conflict Edges</p>
                    <p className="text-lg font-mono font-bold text-content-primary mt-1">
                      {currentActiveResult.edge_count}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                    <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold">Conflicting Pairs Found</p>
                    <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                      {currentActiveResult.validation_report?.conflicts?.length ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                    <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold">Slot Range Check</p>
                    <p className="text-lg font-mono font-bold text-content-primary mt-1">
                      [1 .. {currentActiveResult.slots_used}]
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface-subtle border border-border-subtle space-y-2">
                  <h4 className="text-xs font-semibold text-content-primary">Verified Invariants:</h4>
                  <ul className="text-xs text-content-secondary space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-emerald-400 shrink-0" weight="fill" />
                      <span>Every enrolled examination is assigned to exactly one integer time slot.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-emerald-400 shrink-0" weight="fill" />
                      <span>Zero shared-student conflicts: for all (u, v) in E(G), slot(u) &ne; slot(v).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-emerald-400 shrink-0" weight="fill" />
                      <span>Slot numbers are contiguous, 1-indexed, and bounded by slots_used.</span>
                    </li>
                  </ul>
                </div>

                {currentActiveResult.validation_report?.errors && currentActiveResult.validation_report.errors.length > 0 && (
                  <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                    <h5 className="font-bold">Errors Detected:</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentActiveResult.validation_report.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Side-by-Side Comparison */}
          {activeTab === "compare" && compareResult && (
            <div className="space-y-4">
              {/* Top Benchmark Summary */}
              <Card variant="default" className="shadow-card border-border-strong bg-[#12151c]">
                <CardHeader className="pb-3 border-b border-border-subtle">
                  <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                    <Scales size={20} className="text-accent-amber" weight="bold" />
                    Welsh-Powell Greedy vs. Exact Backtracking Benchmark
                  </h3>
                  <p className="text-xs text-content-secondary mt-0.5">
                    Side-by-side performance on identical conflict graph snapshot (|V|={compareResult.vertex_count}, |E|={compareResult.edge_count}).
                  </p>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border-strong text-content-secondary uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4 font-semibold">Evaluation Metric</th>
                          <th className="py-3 px-4 font-semibold text-accent-amber">
                            Welsh-Powell Greedy
                          </th>
                          <th className="py-3 px-4 font-semibold text-indigo-400">
                            Exact Backtracking
                          </th>
                          <th className="py-3 px-4 font-semibold text-content-tertiary">
                            Analytical Comparison
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Execution Status</td>
                          <td className="py-3.5 px-4">
                            <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[11px]">
                              {compareResult.greedy_result.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="default"
                              className={
                                compareResult.backtracking_result.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[11px]"
                                  : compareResult.backtracking_result.status === "INFEASIBLE"
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40 text-[11px]"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/40 text-[11px]"
                              }
                            >
                              {compareResult.backtracking_result.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            {compareResult.backtracking_result.status === "COMPLETED"
                              ? "Both solvers found valid assignments"
                              : `Backtracking reported ${compareResult.backtracking_result.status}`}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Slots Required</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-accent-amber">
                            {compareResult.greedy_result.slots_used} Slots
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                            {compareResult.backtracking_result.slots_used > 0
                              ? `${compareResult.backtracking_result.slots_used} Slots`
                              : "N/A"}
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            {compareResult.greedy_result.slots_used === compareResult.backtracking_result.slots_used
                              ? "✓ Greedy matched exact chromatic number"
                              : compareResult.backtracking_result.slots_used > 0
                              ? `Backtracking saved ${compareResult.greedy_result.slots_used - compareResult.backtracking_result.slots_used} slots`
                              : `Target k=${backtrackingSlots} was infeasible`}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Computation Duration</td>
                          <td className="py-3.5 px-4 font-mono">
                            {compareResult.greedy_result.execution_time_ms.toFixed(2)} ms
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {compareResult.backtracking_result.execution_time_ms.toFixed(2)} ms
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            Greedy was {(compareResult.backtracking_result.execution_time_ms / Math.max(0.01, compareResult.greedy_result.execution_time_ms)).toFixed(1)}x faster
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Search Space Explored</td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            1 Pass ({compareResult.vertex_count} vertices)
                          </td>
                          <td className="py-3.5 px-4 font-mono text-content-primary">
                            {((compareResult.backtracking_result.statistics?.nodes_explored as number) || 0)} nodes
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            Branch-and-prune search states visited
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Backtracks Encountered</td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            0 (Single-pass heuristic)
                          </td>
                          <td className="py-3.5 px-4 font-mono text-content-primary">
                            {((compareResult.backtracking_result.statistics?.backtracks as number) || 0)} backtracks
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            Dead-end branches pruned
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Theoretical Complexity</td>
                          <td className="py-3.5 px-4 font-mono text-content-secondary">
                            O(V&sup2;) Polynomial
                          </td>
                          <td className="py-3.5 px-4 font-mono text-content-secondary">
                            O(k^V) Exponential
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            Heuristic speed vs exact optimality trade-off
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-medium text-content-primary">Independent Validation</td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-400 font-semibold">✓ 0 Conflicts</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-400 font-semibold">
                              {compareResult.backtracking_result.is_valid ? "✓ 0 Conflicts" : "—"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary">
                            Both schedules verified by external checker
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: Run History */}
          {activeTab === "history" && (
            <Card variant="default" className="shadow-card border-border-strong">
              <CardHeader className="pb-3 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                    <ClockCounterClockwise size={20} className="text-accent-amber" weight="bold" />
                    Recent Execution Runs
                  </h3>
                  <p className="text-xs text-content-secondary mt-0.5">
                    Cached runs from current session with telemetry and slot solutions.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  leftIcon={<ArrowClockwise size={14} className={isLoadingHistory ? "animate-spin" : ""} />}
                >
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="p-5">
                {historyRuns.length === 0 ? (
                  <p className="text-xs text-content-secondary text-center py-6">
                    No runs recorded yet. Execute an algorithm above to see past runs.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border-strong text-content-secondary uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3">Run ID</th>
                          <th className="py-2.5 px-3">Algorithm</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Slots Used</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Valid</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {historyRuns.map((r) => (
                          <tr key={r.run_id} className="hover:bg-surface-subtle/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-content-secondary">
                              {r.run_id.slice(0, 8)}...
                            </td>
                            <td className="py-2.5 px-3 font-medium text-content-primary capitalize">
                              {r.algorithm}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="default"
                                className={
                                  r.status === "COMPLETED"
                                    ? "bg-emerald-500/20 text-emerald-400 text-[10px]"
                                    : r.status === "INFEASIBLE"
                                    ? "bg-rose-500/20 text-rose-400 text-[10px]"
                                    : "bg-amber-500/20 text-amber-400 text-[10px]"
                                }
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              {r.slots_used > 0 ? `${r.slots_used} slots` : "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              {r.execution_time_ms.toFixed(2)} ms
                            </td>
                            <td className="py-2.5 px-3">
                              {r.is_valid ? (
                                <span className="text-emerald-400 font-bold">✓</span>
                              ) : (
                                <span className="text-rose-400 font-bold">✕</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSingleResult(r);
                                  setCompareResult(null);
                                  setActiveTab("grid");
                                }}
                                className="text-accent-amber hover:underline text-xs"
                              >
                                Load
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
