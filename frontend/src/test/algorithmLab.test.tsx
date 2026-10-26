import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { AlgorithmLabPage } from "@/routes/AlgorithmLabPage";
import { apiClient } from "@/services/apiClient";
import type {
  ConflictGraphResponse,
  ScheduleRunResponse,
  ScheduleCompareResponse,
} from "@/types/api";

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
};

const mockGraphData: ConflictGraphResponse = {
  vertex_count: 4,
  edge_count: 3,
  isolated_examinations: ["CHEM101"],
  degrees: {
    CS101: 2,
    MATH201: 2,
    PHYS101: 2,
    CHEM101: 0,
  },
  adjacency: {
    CS101: ["MATH201", "PHYS101"],
    MATH201: ["CS101", "PHYS101"],
    PHYS101: ["CS101", "MATH201"],
    CHEM101: [],
  },
  vertices: [
    { id: "e1", code: "CS101", name: "Computer Science I", degree: 2, department: "CS" },
    { id: "e2", code: "MATH201", name: "Linear Algebra", degree: 2, department: "Math" },
    { id: "e3", code: "PHYS101", name: "Physics I", degree: 2, department: "Physics" },
    { id: "e4", code: "CHEM101", name: "General Chemistry", degree: 0, department: "Chemistry" },
  ],
  edges: [
    { source: "CS101", target: "MATH201", weight: 2, shared_students: ["S1", "S2"] },
    { source: "MATH201", target: "PHYS101", weight: 1, shared_students: ["S3"] },
    { source: "CS101", target: "PHYS101", weight: 1, shared_students: ["S4"] },
  ],
};

const mockGreedySuccess: ScheduleRunResponse = {
  run_id: "test-greedy-run-12345",
  algorithm: "greedy",
  ordering_strategy: "descending_degree",
  max_colors: null,
  status: "COMPLETED",
  is_complete: true,
  is_valid: true,
  slots_used: 3,
  slot_assignments: {
    CS101: 1,
    MATH201: 2,
    PHYS101: 3,
    CHEM101: 1,
  },
  slot_details: [
    { exam_code: "CS101", exam_name: "Computer Science I", slot: 1, degree: 2, department: "CS" },
    { exam_code: "CHEM101", exam_name: "General Chemistry", slot: 1, degree: 0, department: "Chemistry" },
    { exam_code: "MATH201", exam_name: "Linear Algebra", slot: 2, degree: 2, department: "Math" },
    { exam_code: "PHYS101", exam_name: "Physics I", slot: 3, degree: 2, department: "Physics" },
  ],
  slots_summary: {
    1: ["CS101", "CHEM101"],
    2: ["MATH201"],
    3: ["PHYS101"],
  },
  execution_time_ms: 1.25,
  vertex_count: 4,
  edge_count: 3,
  validation_report: {
    is_valid: true,
    errors: [],
    checks_performed: ["completeness", "pairwise_conflicts", "range_check"],
    conflicts: [],
    missing_examinations: [],
    unknown_examinations: [],
    invalid_color_values: [],
    out_of_range_colors: [],
    metadata: {},
  },
  statistics: {
    nodes_explored: 4,
    backtracks: 0,
  },
  explanation: "Welsh-Powell greedy heuristic assigned 4 courses into 3 time slots without conflicts.",
  created_at: new Date().toISOString(),
};

const mockBacktrackingInfeasible: ScheduleRunResponse = {
  run_id: "test-backtracking-infeasible-123",
  algorithm: "backtracking",
  ordering_strategy: "descending_degree",
  max_colors: 2,
  status: "INFEASIBLE",
  is_complete: false,
  is_valid: false,
  slots_used: 0,
  slot_assignments: {},
  slot_details: [],
  slots_summary: {},
  execution_time_ms: 2.1,
  vertex_count: 4,
  edge_count: 3,
  validation_report: {
    is_valid: false,
    errors: ["No valid coloring found"],
    checks_performed: [],
    conflicts: [],
    missing_examinations: [],
    unknown_examinations: [],
    invalid_color_values: [],
    out_of_range_colors: [],
    metadata: {},
  },
  statistics: {
    nodes_explored: 12,
    backtracks: 8,
  },
  explanation: "Exhaustive search proved no valid timetable exists with at most 2 slots.",
  created_at: new Date().toISOString(),
};

const mockCompareResponse: ScheduleCompareResponse = {
  compare_id: "compare-run-999",
  timestamp: new Date().toISOString(),
  vertex_count: 4,
  edge_count: 3,
  max_colors_constraint: 3,
  greedy_result: mockGreedySuccess,
  backtracking_result: {
    ...mockGreedySuccess,
    run_id: "test-backtracking-run-5678",
    algorithm: "backtracking",
    execution_time_ms: 3.8,
    statistics: {
      nodes_explored: 14,
      backtracks: 2,
    },
    explanation: "Backtracking found an exact 3-slot coloring after exploring 14 search states.",
  },
  summary_explanation: "Greedy heuristic matched the exact chromatic number of 3 slots.",
};

describe("AlgorithmLabPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValue(mockGraphData);
    vi.spyOn(apiClient.scheduling, "listRuns").mockResolvedValue([]);
  });

  it("renders page header, telemetry badge, and solver configuration", async () => {
    renderWithProviders(<AlgorithmLabPage />);

    expect(
      screen.getByText("Algorithm Laboratory & Timetable Generation")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/\|V\|=4 • \|E\|=3 • Δ=2/)).toBeInTheDocument();
    });

    expect(screen.getByText("Greedy (Welsh-Powell)")).toBeInTheDocument();
    expect(screen.getByText("Exact Backtracking")).toBeInTheDocument();
    expect(screen.getByText("Run Both (Benchmark)")).toBeInTheDocument();
  });

  it("renders empty graph alert when vertex_count is 0", async () => {
    vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce({
      vertex_count: 0,
      edge_count: 0,
      isolated_examinations: [],
      degrees: {},
      adjacency: {},
      vertices: [],
      edges: [],
    });

    renderWithProviders(<AlgorithmLabPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Conflict Graph is Empty (|V| = 0)")
      ).toBeInTheDocument();
    });
  });

  it("executes Greedy Welsh-Powell scheduling and displays slot grid", async () => {
    const runSpy = vi.spyOn(apiClient.scheduling, "run").mockResolvedValueOnce(mockGreedySuccess);

    renderWithProviders(<AlgorithmLabPage />);

    await waitFor(() => {
      expect(screen.getByText(/\|V\|=4/)).toBeInTheDocument();
    });

    const executeBtn = screen.getByText("Generate Timetable (Greedy)");
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(runSpy).toHaveBeenCalledWith({
        algorithm: "greedy",
        ordering_strategy: "descending_degree",
        max_colors: undefined,
      });
    });

    // Check results bar
    await waitFor(() => {
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
      expect(screen.getByText("3 Slots")).toBeInTheDocument();
      expect(screen.getByText("0 Conflicts (100% Valid)")).toBeInTheDocument();
    });

    // Check slot headers in the grid
    expect(screen.getByText("Slot 1")).toBeInTheDocument();
    expect(screen.getByText("Slot 2")).toBeInTheDocument();
    expect(screen.getByText("Slot 3")).toBeInTheDocument();
    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("MATH201")).toBeInTheDocument();
    expect(screen.getByText("PHYS101")).toBeInTheDocument();
    expect(screen.getByText("CHEM101")).toBeInTheDocument();
  });

  it("executes Backtracking and handles INFEASIBLE status properly", async () => {
    const runSpy = vi
      .spyOn(apiClient.scheduling, "run")
      .mockResolvedValueOnce(mockBacktrackingInfeasible);

    renderWithProviders(<AlgorithmLabPage />);

    await waitFor(() => {
      expect(screen.getByText(/\|V\|=4/)).toBeInTheDocument();
    });

    // Switch to Backtracking tab
    const btTab = screen.getByText("Exact Backtracking");
    fireEvent.click(btTab);

    expect(screen.getByText("Target Slot Limit (k)")).toBeInTheDocument();

    const executeBtn = screen.getByRole("button", { name: /Execute Exact Backtracking/i });
    expect(executeBtn).not.toBeDisabled();
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(runSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          algorithm: "backtracking",
        })
      );
      expect(screen.getAllByText(/INFEASIBLE/).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText(/Exhaustive search proved no valid timetable exists/).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("executes Side-by-Side comparison and renders comparative benchmark table", async () => {
    const compareSpy = vi
      .spyOn(apiClient.scheduling, "compare")
      .mockResolvedValueOnce(mockCompareResponse);

    renderWithProviders(<AlgorithmLabPage />);

    await waitFor(() => {
      expect(screen.getByText(/\|V\|=4/)).toBeInTheDocument();
    });

    // Switch to compare mode
    const compareTab = screen.getByText("Run Both (Benchmark)");
    fireEvent.click(compareTab);

    const executeBtn = screen.getByText("Execute Side-by-Side Benchmark");
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(compareSpy).toHaveBeenCalled();
    });

    // Expect benchmark table to appear
    await waitFor(() => {
      expect(
        screen.getByText("Welsh-Powell Greedy vs. Exact Backtracking Benchmark")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Evaluation Metric")).toBeInTheDocument();
    expect(screen.getByText("O(V²) Polynomial")).toBeInTheDocument();
    expect(screen.getByText("O(k^V) Exponential")).toBeInTheDocument();
    expect(
      screen.getByText("✓ Greedy matched exact chromatic number")
    ).toBeInTheDocument();
  });

  it("navigates to Independent Validation report tab and inspects invariants", async () => {
    vi.spyOn(apiClient.scheduling, "run").mockResolvedValueOnce(mockGreedySuccess);

    renderWithProviders(<AlgorithmLabPage />);

    await waitFor(() => {
      expect(screen.getByText(/\|V\|=4/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Generate Timetable (Greedy)"));

    await waitFor(() => {
      expect(screen.getByText("Validation Report")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Validation Report"));

    expect(
      screen.getByText("Independent Constraint Verification Report")
    ).toBeInTheDocument();
    expect(screen.getByText("VALID TIMETABLE")).toBeInTheDocument();
    expect(
      screen.getByText(/Every enrolled examination is assigned to exactly one integer time slot/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Zero shared-student conflicts: for all \(u, v\) in E\(G\)/)
    ).toBeInTheDocument();
  });
});
