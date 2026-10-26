import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/services/apiClient";
import type { ConflictGraphResponse } from "@/types/api";
import {
  GitFork,
  ArrowClockwise,
  WarningCircle,
  MagnifyingGlass,
  Info,
  CheckCircle,
  Sparkle,
  BookOpen,
  Users,
  ArrowsLeftRight,
} from "@phosphor-icons/react";

export const ConflictGraphPage: React.FC = () => {
  const [data, setData] = useState<ConflictGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"vertices" | "edges">("vertices");

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

  // Derived metrics
  const vertices = data?.vertices || [];
  const edges = data?.edges || [];
  const vertexCount = vertices.length;
  const edgeCount = edges.length;
  const isolatedVertices = vertices.filter((v) => v.degree === 0);
  const maxDegree = vertices.length > 0 ? Math.max(...vertices.map((v) => v.degree)) : 0;
  const density =
    vertexCount > 1
      ? ((2 * edgeCount) / (vertexCount * (vertexCount - 1))) * 100
      : 0;

  // Filtered views
  const filteredVertices = vertices.filter((v) =>
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEdges = edges.filter((e) =>
    e.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.shared_students.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8" data-testid="conflict-graph-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-content-primary tracking-tight">
              Conflict Graph Structure
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
              Live Engine
            </span>
          </div>
          <p className="text-sm text-content-secondary mt-1">
            Mathematical graph representation derived from active student course enrolments.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Phase 6 Milestone Callout */}
      <div className="rounded-lg bg-surface border border-accent-amber/20 p-4 flex items-start gap-3 shadow-subtle">
        <div className="p-1.5 rounded-md bg-accent-amber/10 text-accent-amber shrink-0 mt-0.5">
          <Info size={18} weight="bold" />
        </div>
        <div className="flex-1 text-xs">
          <p className="font-semibold text-content-primary">
            Phase 5 Graph Engine Status: Real Graph Data Active
          </p>
          <p className="text-content-secondary mt-0.5 leading-relaxed">
            This panel directly reflects the backend symmetric graph model (<code className="font-mono text-content-primary">ConflictGraph</code>).
            Vertices represent examinations, edges represent shared student conflicts with weights, and degrees dictate graph coloring complexity.
            The interactive force-directed canvas visualizer will be unlocked in <strong>Phase 6</strong>.
          </p>
        </div>
      </div>

      {/* Error state */}
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

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
              <span>Density</span>
              <GitFork size={16} />
            </div>
            <div className="text-2xl font-bold text-content-primary mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-14" /> : `${density.toFixed(1)}%`}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Connectivity</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Max Degree Δ</span>
              <Users size={16} />
            </div>
            <div className="text-2xl font-bold text-accent-teal mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-10" /> : maxDegree}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Highest node degree</p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-content-muted text-xs font-mono uppercase">
              <span>Isolated</span>
              <CheckCircle size={16} />
            </div>
            <div className="text-2xl font-bold text-accent-teal mt-2">
              {isLoading ? <Skeleton variant="text" className="h-8 w-10" /> : isolatedVertices.length}
            </div>
            <p className="text-[11px] text-content-muted mt-1">Zero conflicts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card variant="default">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle p-4">
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 bg-surface-elevated rounded-md border border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab("vertices")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "vertices"
                    ? "bg-surface text-content-primary shadow-subtle"
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
                    ? "bg-surface text-content-primary shadow-subtle"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                Conflict Edges ({edges.length})
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
            />
            <input
              type="text"
              placeholder={
                activeTab === "vertices"
                  ? "Filter courses..."
                  : "Filter edges or student IDs..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs bg-surface border border-border-strong text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent-amber"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" className="h-10 w-full" />
              ))}
            </div>
          ) : vertexCount === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-surface border border-border-strong flex items-center justify-center text-content-muted mx-auto">
                <GitFork size={24} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-content-primary">
                  Conflict Graph is Empty
                </h3>
                <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
                  No examinations or enrolments are present in the database. Add courses or import a sample academic dataset from the Overview page.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Link to="/app">
                  <Button variant="secondary" size="sm" leftIcon={<Sparkle size={14} />}>
                    Load Sample Data in Overview
                  </Button>
                </Link>
                <Link to="/app/examinations">
                  <Button variant="primary" size="sm" leftIcon={<BookOpen size={14} />}>
                    Add Examinations
                  </Button>
                </Link>
              </div>
            </div>
          ) : activeTab === "vertices" ? (
            /* Vertices & Adjacency Table */
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
                                  : v.degree >= 4
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
                                Isolated (Slot-Independent)
                              </span>
                            ) : (
                              <span className="text-[11px] text-content-secondary">
                                {v.degree} edge{v.degree === 1 ? "" : "s"}
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
            /* Edges Table */
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
  );
};
