import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { ConflictGraphPage } from "@/routes/ConflictGraphPage";
import { apiClient } from "@/services/apiClient";
import { computeGraphLayout } from "@/lib/graphLayout";
import type { ConflictGraphResponse } from "@/types/api";

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
  vertex_count: 5,
  edge_count: 3,
  isolated_examinations: ["CHEM101", "BIO101"],
  degrees: {
    CS101: 2,
    MATH201: 1,
    PHYS101: 3,
    CHEM101: 0,
    BIO101: 0,
  },
  adjacency: {
    CS101: ["MATH201", "PHYS101"],
    MATH201: ["CS101", "PHYS101"],
    PHYS101: ["CS101", "MATH201"],
    CHEM101: [],
    BIO101: [],
  },
  vertices: [
    {
      id: "exam-cs101",
      code: "CS101",
      name: "Computer Science I",
      department: "Computer Science",
      semester: "Fall 2026",
      degree: 2,
    },
    {
      id: "exam-math201",
      code: "MATH201",
      name: "Linear Algebra",
      department: "Mathematics",
      semester: "Fall 2026",
      degree: 1,
    },
    {
      id: "exam-phys101",
      code: "PHYS101",
      name: "Classical Mechanics",
      department: "Physics",
      semester: "Fall 2026",
      degree: 3,
    },
    {
      id: "exam-chem101",
      code: "CHEM101",
      name: "General Chemistry",
      department: "Chemistry",
      semester: "Fall 2026",
      degree: 0,
    },
    {
      id: "exam-bio101",
      code: "BIO101",
      name: "General Biology",
      department: "Biology",
      semester: "Fall 2026",
      degree: 0,
    },
  ],
  edges: [
    {
      source: "CS101",
      target: "MATH201",
      weight: 3,
      shared_students: ["STU001", "STU002", "STU003"],
    },
    {
      source: "CS101",
      target: "PHYS101",
      weight: 2,
      shared_students: ["STU004", "STU005"],
    },
    {
      source: "PHYS101",
      target: "MATH201",
      weight: 1,
      shared_students: ["STU006"],
    },
  ],
};

describe("Phase 6: Conflict Graph Explorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Graph Layout Engine (computeGraphLayout)", () => {
    it("computes deterministic layout with nodes and formatted edges", () => {
      const result = computeGraphLayout(mockGraphData.vertices, mockGraphData.edges, {
        mode: "concentric",
        selectedNodeId: null,
        searchTerm: "",
        filterMode: "all",
      });

      expect(result.nodes).toHaveLength(5);
      expect(result.edges).toHaveLength(3);
      expect(result.visibleVertexCount).toBe(5);
      expect(result.visibleEdgeCount).toBe(3);

      const csNode = result.nodes.find((n) => n.id === "CS101");
      expect(csNode).toBeDefined();
      expect(csNode?.type).toBe("examNode");
      expect(typeof csNode?.position.x).toBe("number");
      expect(typeof csNode?.position.y).toBe("number");
    });

    it("filters nodes and incident edges under 'isolated' filterMode", () => {
      const result = computeGraphLayout(mockGraphData.vertices, mockGraphData.edges, {
        mode: "circle",
        selectedNodeId: null,
        searchTerm: "",
        filterMode: "isolated",
      });

      expect(result.visibleVertexCount).toBe(2);
      expect(result.visibleEdgeCount).toBe(0);
      expect(result.nodes.map((n) => n.id)).toEqual(["CHEM101", "BIO101"]);
    });

    it("filters nodes under 'conflicts' filterMode", () => {
      const result = computeGraphLayout(mockGraphData.vertices, mockGraphData.edges, {
        mode: "grid",
        selectedNodeId: null,
        searchTerm: "",
        filterMode: "conflicts",
      });

      expect(result.visibleVertexCount).toBe(3);
      expect(result.visibleEdgeCount).toBe(3);
    });

    it("applies highlighting to selected node and direct neighbours", () => {
      const result = computeGraphLayout(mockGraphData.vertices, mockGraphData.edges, {
        mode: "concentric",
        selectedNodeId: "CS101",
        searchTerm: "",
        filterMode: "all",
      });

      const csNode = result.nodes.find((n) => n.id === "CS101");
      const mathNode = result.nodes.find((n) => n.id === "MATH201");
      const chemNode = result.nodes.find((n) => n.id === "CHEM101");

      const csData = csNode?.data as { isSelected: boolean; isNeighbor: boolean; isDimmed: boolean };
      const mathData = mathNode?.data as { isSelected: boolean; isNeighbor: boolean; isDimmed: boolean };
      const chemData = chemNode?.data as { isSelected: boolean; isNeighbor: boolean; isDimmed: boolean };

      expect(csData.isSelected).toBe(true);
      expect(csData.isNeighbor).toBe(false);

      expect(mathData.isSelected).toBe(false);
      expect(mathData.isNeighbor).toBe(true);

      expect(chemData.isSelected).toBe(false);
      expect(chemData.isNeighbor).toBe(false);
      expect(chemData.isDimmed).toBe(true);
    });
  });

  describe("ConflictGraphPage UI & Interactions", () => {
    it("renders empty state when no vertices or edges exist", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce({
        vertex_count: 0,
        edge_count: 0,
        isolated_examinations: [],
        degrees: {},
        adjacency: {},
        vertices: [],
        edges: [],
      });

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByText("Conflict Graph is Empty")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/No examinations or course enrolments currently exist/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Load Sample Dataset in Overview")).toBeInTheDocument();
    });

    it("renders zero-conflict invariant banner when vertices exist but no edges", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce({
        vertex_count: 2,
        edge_count: 0,
        isolated_examinations: ["E1", "E2"],
        degrees: { E1: 0, E2: 0 },
        adjacency: { E1: [], E2: [] },
        vertices: [
          { id: "e1", code: "E1", name: "Exam 1", degree: 0 },
          { id: "e2", code: "E2", name: "Exam 2", degree: 0 },
        ],
        edges: [],
      });

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByText("Zero Conflict Invariant Detected")).toBeInTheDocument();
      });

      expect(screen.getByText(/χ\(G\) = 1/i)).toBeInTheDocument();
    });

    it("renders key metric cards with correct values", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce(mockGraphData);

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByText("Conflict Graph Explorer")).toBeInTheDocument();
      });

      expect(screen.getByText("Vertices |V|")).toBeInTheDocument();
      expect(screen.getByText("Edges |E|")).toBeInTheDocument();
      expect(screen.getByText("Conflicted")).toBeInTheDocument();
      expect(screen.getByText("Isolated")).toBeInTheDocument();
      expect(screen.getByText("Max Degree Δ")).toBeInTheDocument();
      expect(screen.getByText("Density")).toBeInTheDocument();

      // Check numbers in metrics grid
      expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    });

    it("renders custom ExamNodes on the React Flow canvas", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce(mockGraphData);

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();
      });

      expect(screen.getByTestId("exam-node-MATH201")).toBeInTheDocument();
      expect(screen.getByTestId("exam-node-PHYS101")).toBeInTheDocument();
      expect(screen.getByTestId("exam-node-CHEM101")).toBeInTheDocument();
      expect(screen.getByTestId("exam-node-BIO101")).toBeInTheDocument();

      // Degree badges
      expect(screen.getByText("d=2")).toBeInTheDocument();
      expect(screen.getByText("d=1")).toBeInTheDocument();
      expect(screen.getByText("d=3")).toBeInTheDocument();
      expect(screen.getAllByText("d=0")).toHaveLength(2);
    });

    it("opens details panel when a node is clicked and shows conflicting courses and rosters", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce(mockGraphData);

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();
      });

      // Click CS101 node
      fireEvent.click(screen.getByTestId("exam-node-CS101"));

      await waitFor(() => {
        expect(screen.getByTestId("graph-details-panel")).toBeInTheDocument();
      });

      const panel = screen.getByTestId("graph-details-panel");

      // Selected course title and specs inside panel
      expect(within(panel).getByText("CS101")).toBeInTheDocument();
      expect(within(panel).getByText("Computer Science I")).toBeInTheDocument();
      expect(within(panel).getByText("d(v) = 2")).toBeInTheDocument();

      // Neighbors in the panel
      expect(within(panel).getByText("MATH201")).toBeInTheDocument();
      expect(within(panel).getByText("PHYS101")).toBeInTheDocument();
      expect(within(panel).getByText("3 students")).toBeInTheDocument();
      expect(within(panel).getByText("2 students")).toBeInTheDocument();

      // Expand shared student roster
      const viewStudentsBtn = within(panel).getByText("View 3 common students");
      fireEvent.click(viewStudentsBtn);

      expect(within(panel).getByText("STU001")).toBeInTheDocument();
      expect(within(panel).getByText("STU002")).toBeInTheDocument();
      expect(within(panel).getByText("STU003")).toBeInTheDocument();

      // Close details panel
      const deselectBtn = within(panel).getByText("Deselect Course");
      fireEvent.click(deselectBtn);

      expect(screen.queryByTestId("graph-details-panel")).not.toBeInTheDocument();
    });

    it("allows switching filter pills (Isolated, Conflicted, Hubs, All)", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce(mockGraphData);

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();
      });

      // Click "Isolated (2)" filter
      const isolatedFilterBtn = screen.getByRole("button", { name: /Isolated \(2\)/i });
      fireEvent.click(isolatedFilterBtn);

      // Now only isolated nodes are visible
      expect(screen.getByTestId("exam-node-CHEM101")).toBeInTheDocument();
      expect(screen.getByTestId("exam-node-BIO101")).toBeInTheDocument();
      expect(screen.queryByTestId("exam-node-CS101")).not.toBeInTheDocument();

      // Click "Hubs d≥3" filter
      const hubsFilterBtn = screen.getByRole("button", { name: /Hubs d≥3 \(1\)/i });
      fireEvent.click(hubsFilterBtn);

      expect(screen.getByTestId("exam-node-PHYS101")).toBeInTheDocument();
      expect(screen.queryByTestId("exam-node-CHEM101")).not.toBeInTheDocument();

      // Click "All" filter to restore
      const allFilterBtn = screen.getByRole("button", { name: /All \(5\)/i });
      fireEvent.click(allFilterBtn);

      expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();
      expect(screen.getByTestId("exam-node-CHEM101")).toBeInTheDocument();
    });

    it("allows switching layout modes without errors", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValueOnce(mockGraphData);

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();
      });

      const circleBtn = screen.getByRole("button", { name: "Circular" });
      fireEvent.click(circleBtn);
      expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();

      const gridBtn = screen.getByRole("button", { name: "Grid" });
      fireEvent.click(gridBtn);
      expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();

      const concentricBtn = screen.getByRole("button", { name: "Concentric" });
      fireEvent.click(concentricBtn);
      expect(screen.getByTestId("exam-node-CS101")).toBeInTheDocument();
    });
  });
});
