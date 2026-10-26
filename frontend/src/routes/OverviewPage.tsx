import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Student,
  Link as LinkIcon,
  Graph,
  ArrowRight,
  Database,
  ArrowClockwise,
  CalendarCheck,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/services/apiClient";

interface DashboardMetrics {
  totalExams: number;
  totalStudents: number;
  totalEnrolments: number;
  vertexCount: number;
  edgeCount: number;
  isolatedExams: string[];
  conflictHubs: { code: string; name: string; degree: number }[];
}

export const OverviewPage: React.FC = () => {
  const { addToast } = useToast();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSampleLoading, setIsSampleLoading] = useState<boolean>(false);
  const [resetBeforeLoad, setResetBeforeLoad] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel requests for live metrics
      const [examsRes, studentsRes, enrolmentsRes, graphRes] = await Promise.all([
        apiClient.exams.list({ limit: 100 }, signal),
        apiClient.students.list({ limit: 1 }, signal),
        apiClient.enrolments.list({ limit: 1 }, signal),
        apiClient.graph.getConflicts(signal),
      ]);

      // Calculate highest degree conflict hubs from graph
      const conflictHubs = graphRes.vertices
        .map((v) => ({ code: v.code, name: v.name, degree: v.degree }))
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 5);

      setMetrics({
        totalExams: examsRes.total,
        totalStudents: studentsRes.total,
        totalEnrolments: enrolmentsRes.total,
        vertexCount: graphRes.vertex_count,
        edgeCount: graphRes.edge_count,
        isolatedExams: graphRes.isolated_examinations,
        conflictHubs,
      });
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      const apiErr = err as { message?: string };
      setError(
        apiErr?.message ||
          "Failed to load dashboard data. Ensure the backend FastAPI server is running."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [fetchDashboardData]);

  const handleLoadSampleData = async () => {
    setIsSampleLoading(true);
    try {
      const result = await apiClient.sampleData.load({ reset: resetBeforeLoad });
      addToast({
        title: result.status === "success" ? "Sample Data Loaded" : "Import Skipped",
        message: result.message,
        type: result.status === "success" ? "success" : "info",
      });
      // Refresh dashboard with newly imported records
      await fetchDashboardData();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      addToast({
        title: "Import Failed",
        message: apiErr?.message || "Could not load sample dataset.",
        type: "error",
      });
    } finally {
      setIsSampleLoading(false);
    }
  };

  const isEmpty = (metrics?.totalExams || 0) === 0;

  return (
    <div className="space-y-8" data-testid="dashboard-content">
      {/* 1. Welcome & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-amber">
              Academic Operations
            </span>
            <span className="text-content-muted">•</span>
            <Badge variant="teal" size="sm" dot>
              Live Data Connected
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
            Welcome to SLOTWISE
          </h2>
          <p className="text-sm text-content-secondary max-w-2xl mt-1.5 leading-relaxed">
            Examination Scheduling Studio — Real-time conflict matrix and course enrolment data derived from persistent database records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData()}
            disabled={isLoading}
            leftIcon={<ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          <Link to="/app/examinations">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
              Manage Examinations
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && !metrics ? (
        <div className="space-y-6" data-testid="dashboard-loading">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-32" />
            ))}
          </div>
          <Skeleton variant="rectangular" className="h-64" />
        </div>
      ) : error && !metrics ? (
        <div className="py-8" data-testid="dashboard-error">
          <ErrorState
            title="Backend Connection Required"
            message={error}
            onRetry={() => fetchDashboardData()}
          />
        </div>
      ) : isEmpty ? (
        <Card variant="default">
          <CardContent className="py-12">
            <EmptyState
              icon={<CalendarCheck size={32} className="text-accent-amber" />}
              title="No Examination Records in Database"
              description="The database is initialized, but no examination courses or student rosters have been loaded. You can load our standard university engineering and science dataset with a single click, or manually register examinations."
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleLoadSampleData}
                  isLoading={isSampleLoading}
                  leftIcon={<Database size={16} />}
                >
                  Load 10-Course Sample Dataset
                </Button>
              }
              secondaryAction={
                <Link to="/app/examinations">
                  <Button variant="outline" size="md">
                    Create Examination
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 3. Key Operational Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Exams */}
            <Card variant="subtle" className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-content-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Examinations</span>
                <GraduationCap size={20} className="text-accent-amber" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-content-primary font-mono" data-testid="metric-total-exams">
                  {metrics?.totalExams}
                </span>
                <span className="text-xs text-content-muted">courses</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-content-secondary">Graph Vertices</span>
                <span className="font-mono font-medium text-content-primary">{metrics?.vertexCount}</span>
              </div>
            </Card>

            {/* Total Students */}
            <Card variant="subtle" className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-content-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Students</span>
                <Student size={20} className="text-accent-teal" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-content-primary font-mono" data-testid="metric-total-students">
                  {metrics?.totalStudents}
                </span>
                <span className="text-xs text-content-muted">enrolled</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-content-secondary">Multi-Course Roster</span>
                <Link to="/app/students" className="text-accent-amber hover:underline font-medium">
                  View Roster
                </Link>
              </div>
            </Card>

            {/* Total Course Enrolments */}
            <Card variant="subtle" className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-content-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Course Enrolments</span>
                <LinkIcon size={20} className="text-content-muted" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-content-primary font-mono" data-testid="metric-total-enrolments">
                  {metrics?.totalEnrolments}
                </span>
                <span className="text-xs text-content-muted">registrations</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-content-secondary">Avg per student</span>
                <span className="font-mono font-medium text-content-primary">
                  {metrics?.totalStudents
                    ? ((metrics.totalEnrolments / metrics.totalStudents).toFixed(1))
                    : 0}
                </span>
              </div>
            </Card>

            {/* Conflict Edges */}
            <Card variant="subtle" className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-content-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Conflict Edges (|E|)</span>
                <Graph size={20} className="text-accent-danger" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-content-primary font-mono" data-testid="metric-total-conflicts">
                  {metrics?.edgeCount}
                </span>
                <span className="text-xs text-content-muted">clashes</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-content-secondary">Isolated Courses</span>
                <span className="font-mono font-medium text-accent-teal">
                  {metrics?.isolatedExams.length}
                </span>
              </div>
            </Card>
          </div>

          {/* 4. Conflict Overview & Top Conflict Hubs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Conflict Hubs Table (2 Columns) */}
            <Card variant="default" className="lg:col-span-2">
              <CardHeader
                title="Conflict Hubs (Degree Centrality)"
                description="Examinations with the highest number of student clashes. Graph coloring heuristics schedule these courses first."
                action={
                  <Link to="/app/conflict-graph">
                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={13} />}>
                      Explore Graph
                    </Button>
                  </Link>
                }
              />
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-subtle/50 text-content-muted font-mono uppercase tracking-wider">
                        <th className="py-2.5 px-4 font-semibold">Course Code</th>
                        <th className="py-2.5 px-4 font-semibold">Course Title</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Degree (d(v))</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {metrics?.conflictHubs.map((hub, idx) => (
                        <tr key={hub.code} className="hover:bg-subtle/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent-amber">
                            {hub.code}
                          </td>
                          <td className="py-3 px-4 text-content-primary font-medium">
                            {hub.name}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-content-primary">
                            {hub.degree}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant={idx === 0 ? "danger" : hub.degree > 2 ? "amber" : "teal"}
                              size="sm"
                            >
                              {hub.degree === 0 ? "Isolated" : `Rank #${idx + 1}`}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between text-xs text-content-muted">
                <span>Derived dynamically from /api/graph/conflicts</span>
                <span>Welsh-Powell Ordering: Descending Degree</span>
              </CardFooter>
            </Card>

            {/* Sample Data & Management Actions (1 Column) */}
            <Card variant="default">
              <CardHeader
                title="Dataset Controls"
                description="Manage academic data persistence or reset to synthetic university benchmarks."
              />
              <CardContent className="space-y-4">
                <div className="p-3.5 rounded-lg bg-subtle border border-border-subtle space-y-2">
                  <div className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                    <Database size={15} className="text-accent-teal" />
                    <span>Synthetic Benchmark Roster</span>
                  </div>
                  <p className="text-[11px] text-content-secondary leading-relaxed">
                    Loads 10 academic examinations across CS, Math, Physics, and Natural Sciences with 20 students forming realistic conflict clusters.
                  </p>
                  <label className="flex items-center gap-2 pt-2 text-xs text-content-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resetBeforeLoad}
                      onChange={(e) => setResetBeforeLoad(e.target.checked)}
                      className="rounded border-border-strong text-accent-amber focus:ring-accent-amber"
                    />
                    <span>Reset existing records before import</span>
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleLoadSampleData}
                    isLoading={isSampleLoading}
                    leftIcon={<Database size={14} />}
                  >
                    Load / Sync Benchmark Data
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <div className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                    Quick Navigation
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Link to="/app/examinations">
                      <Button variant="ghost" size="sm" className="w-full justify-between" rightIcon={<ArrowRight size={12} />}>
                        <span>Examinations Catalog</span>
                        <span className="font-mono text-content-muted text-[11px]">{metrics?.totalExams} items</span>
                      </Button>
                    </Link>
                    <Link to="/app/students">
                      <Button variant="ghost" size="sm" className="w-full justify-between" rightIcon={<ArrowRight size={12} />}>
                        <span>Students & Enrolments</span>
                        <span className="font-mono text-content-muted text-[11px]">{metrics?.totalStudents} students</span>
                      </Button>
                    </Link>
                    <Link to="/app/conflict-graph">
                      <Button variant="ghost" size="sm" className="w-full justify-between" rightIcon={<ArrowRight size={12} />}>
                        <span>Conflict Graph Summary</span>
                        <span className="font-mono text-content-muted text-[11px]">{metrics?.edgeCount} edges</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 5. Recent Activity / Execution History (Strictly honest empty state) */}
          <Card variant="default">
            <CardHeader
              title="Recent Scheduling Runs"
              description="Historical timetable coloring executions, slot counts, and chromatic proofs."
            />
            <CardContent className="py-6">
              <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border-subtle rounded-lg space-y-2">
                <ClockCounterClockwise size={26} className="text-content-muted" />
                <h4 className="text-xs font-semibold text-content-primary">
                  No Timetable Generation Executions Yet
                </h4>
                <p className="text-xs text-content-muted max-w-md">
                  No automated scheduling jobs have been run against the current dataset. Algorithm execution, Welsh-Powell benchmarks, and backtracking solvers will be integrated into the studio in Phase 6.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
