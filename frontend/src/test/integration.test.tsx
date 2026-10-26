import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { BackendStatusBadge } from "../components/layout/BackendStatusBadge";
import { OverviewPage } from "../routes/OverviewPage";
import { ExaminationsPage } from "../routes/ExaminationsPage";
import { StudentsPage } from "../routes/StudentsPage";
import { ConflictGraphPage } from "../routes/ConflictGraphPage";
import { apiClient } from "../services/apiClient";

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>
  );
};

describe("Phase 5 Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("BackendStatusBadge", () => {
    it("renders checking state initially and transitions to connected when healthy", async () => {
      vi.spyOn(apiClient, "getHealth").mockResolvedValue({
        status: "healthy",
        database: "connected",
        app_name: "SLOTWISE API",
        version: "0.1.0",
        environment: "test",
        timestamp: new Date().toISOString(),
      });

      renderWithProviders(<BackendStatusBadge />);

      expect(screen.getByTestId("backend-status-checking")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("backend-status-connected")).toBeInTheDocument();
      });
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("renders disconnected state when backend is unreachable and allows retry", async () => {
      const healthSpy = vi
        .spyOn(apiClient, "getHealth")
        .mockRejectedValueOnce(new Error("Connection refused"))
        .mockResolvedValueOnce({
          status: "healthy",
          database: "connected",
          app_name: "SLOTWISE API",
          version: "0.1.0",
          environment: "test",
          timestamp: new Date().toISOString(),
        });

      renderWithProviders(<BackendStatusBadge />);

      await waitFor(() => {
        expect(screen.getByTestId("backend-status-disconnected")).toBeInTheDocument();
      });
      expect(screen.getByText("API Offline")).toBeInTheDocument();

      // Click retry
      const retryBtn = screen.getByLabelText("Retry backend connection");
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("backend-status-connected")).toBeInTheDocument();
      });
      expect(healthSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("OverviewPage", () => {
    it("renders live dashboard metrics and centrality table from backend", async () => {
      vi.spyOn(apiClient.exams, "list").mockResolvedValue({
        items: [
          {
            id: "e1",
            code: "CS101",
            name: "Computer Science",
            department: "CS",
            semester: "S1",
            duration: 120,
            created_at: "",
            updated_at: "",
            enrolment_count: 10,
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      });

      vi.spyOn(apiClient.students, "list").mockResolvedValue({
        items: [],
        total: 15,
        skip: 0,
        limit: 1,
      });

      vi.spyOn(apiClient.enrolments, "list").mockResolvedValue({
        items: [],
        total: 25,
        skip: 0,
        limit: 1,
      });

      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValue({
        vertex_count: 1,
        edge_count: 3,
        vertices: [{ id: "e1", code: "CS101", name: "Computer Science", degree: 3 }],
        edges: [],
        degrees: { CS101: 3 },
        isolated_examinations: [],
        adjacency: { CS101: [] },
      });

      renderWithProviders(<OverviewPage />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
      });

      // Metric test IDs
      expect(screen.getByTestId("metric-total-exams")).toHaveTextContent("1");
      expect(screen.getByTestId("metric-total-students")).toHaveTextContent("15");
      expect(screen.getByTestId("metric-total-enrolments")).toHaveTextContent("25");
      expect(screen.getByTestId("metric-total-conflicts")).toHaveTextContent("3");

      // Conflict hub table
      expect(screen.getByText("Conflict Hubs (Degree Centrality)")).toBeInTheDocument();
      expect(screen.getByText("CS101")).toBeInTheDocument();
    });

    it("triggers sample data loading when Load Sample Data button is clicked", async () => {
      vi.spyOn(apiClient.exams, "list").mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 100,
      });
      vi.spyOn(apiClient.students, "list").mockResolvedValue({ items: [], total: 0, skip: 0, limit: 1 });
      vi.spyOn(apiClient.enrolments, "list").mockResolvedValue({ items: [], total: 0, skip: 0, limit: 1 });
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValue({
        vertex_count: 0,
        edge_count: 0,
        vertices: [],
        edges: [],
        degrees: {},
        isolated_examinations: [],
        adjacency: {},
      });

      const sampleSpy = vi.spyOn(apiClient.sampleData, "load").mockResolvedValue({
        status: "success",
        message: "Loaded 10 exams",
        dataset_name: "Engineering Roster",
        exams_created: 10,
        students_created: 20,
        enrolments_created: 40,
        conflict_edges_detected: 15,
        isolated_examinations: [],
      });

      renderWithProviders(<OverviewPage />);

      await waitFor(() => {
        expect(screen.getByText("No Examination Records in Database")).toBeInTheDocument();
      });

      const loadBtn = screen.getByRole("button", { name: /Load 10-Course Sample Dataset/i });
      fireEvent.click(loadBtn);

      await waitFor(() => {
        expect(sampleSpy).toHaveBeenCalledWith({ reset: false });
      });
    });
  });

  describe("ExaminationsPage", () => {
    it("renders examination catalog and handles search input", async () => {
      const listSpy = vi.spyOn(apiClient.exams, "list").mockResolvedValue({
        items: [
          {
            id: "e-phy",
            code: "PHY101",
            name: "Physics I",
            department: "Physics",
            semester: "Semester 1",
            duration: 180,
            created_at: "",
            updated_at: "",
            enrolment_count: 12,
          },
        ],
        total: 1,
        skip: 0,
        limit: 25,
      });

      renderWithProviders(<ExaminationsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("examinations-page")).toBeInTheDocument();
      });

      expect(screen.getByText("PHY101")).toBeInTheDocument();
      expect(screen.getByText("Physics I")).toBeInTheDocument();
      expect(screen.getByText("12 students")).toBeInTheDocument();

      // Search
      const searchInput = screen.getByPlaceholderText(/Search by code/i);
      fireEvent.change(searchInput, { target: { value: "PHY" } });
      const filterBtn = screen.getByRole("button", { name: /Filter/i });
      fireEvent.click(filterBtn);

      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ search: "PHY" }),
          expect.anything()
        );
      });
    });

    it("opens Add Examination dialog on button click", async () => {
      vi.spyOn(apiClient.exams, "list").mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 25,
      });

      renderWithProviders(<ExaminationsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("examinations-page")).toBeInTheDocument();
      });

      const addBtns = screen.getAllByRole("button", { name: /Add Examination/i });
      fireEvent.click(addBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Add Course Examination")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("e.g. CS101")).toBeInTheDocument();
      });
    });
  });

  describe("StudentsPage", () => {
    it("renders students list and opens course enrolment modal", async () => {
      vi.spyOn(apiClient.students, "list").mockResolvedValue({
        items: [
          {
            id: "s1",
            student_id: "STU-9901",
            display_name: "Alice Walker",
            created_at: "",
            updated_at: "",
            enrolment_count: 2,
          },
        ],
        total: 1,
        skip: 0,
        limit: 25,
      });

      vi.spyOn(apiClient.exams, "list").mockResolvedValue({
        items: [
          {
            id: "e1",
            code: "CS101",
            name: "Intro to CS",
            created_at: "",
            updated_at: "",
            enrolment_count: 1,
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      });

      vi.spyOn(apiClient.enrolments, "list").mockResolvedValue({
        items: [
          {
            id: "en1",
            student_id: "s1",
            student_identifier: "STU-9901",
            student_name: "Alice Walker",
            exam_id: "e1",
            exam_code: "CS101",
            exam_name: "Intro to CS",
            created_at: "",
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      });

      renderWithProviders(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("students-page")).toBeInTheDocument();
      });

      expect(screen.getByText("STU-9901")).toBeInTheDocument();
      expect(screen.getByText("Alice Walker")).toBeInTheDocument();

      // Open manage enrolments modal
      const manageBtn = screen.getByTitle("Manage course enrolments");
      fireEvent.click(manageBtn);

      await waitFor(() => {
        expect(screen.getByTestId("enrolment-modal")).toBeInTheDocument();
      });
      expect(screen.getByText("Enroll in Course")).toBeInTheDocument();
    });
  });

  describe("ConflictGraphPage", () => {
    it("renders live vertices and conflict edges data summary", async () => {
      vi.spyOn(apiClient.graph, "getConflicts").mockResolvedValue({
        vertex_count: 2,
        edge_count: 1,
        vertices: [
          { id: "e1", code: "CS101", name: "Computer Science", degree: 1 },
          { id: "e2", code: "BIO101", name: "Biology I", degree: 1 },
        ],
        edges: [
          {
            source: "CS101",
            target: "BIO101",
            weight: 4,
            shared_students: ["STU01", "STU02", "STU03", "STU04"],
          },
        ],
        degrees: { CS101: 1, BIO101: 1 },
        isolated_examinations: [],
        adjacency: { CS101: ["BIO101"], BIO101: ["CS101"] },
      });

      renderWithProviders(<ConflictGraphPage />);

      await waitFor(() => {
        expect(screen.getByTestId("conflict-graph-page")).toBeInTheDocument();
      });

      // Vertices & Edge counts
      expect(screen.getByText("Vertices |V|")).toBeInTheDocument();
      expect(screen.getByText("Edges |E|")).toBeInTheDocument();

      // Course nodes in graph explorer
      expect(screen.getAllByText("Computer Science")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Biology I")[0]).toBeInTheDocument();

      // Switch to Conflict Edges tab
      const edgesTab = screen.getByRole("button", { name: /Conflict Edges \(1\)/i });
      fireEvent.click(edgesTab);

      expect(screen.getByText("Exam A")).toBeInTheDocument();
      expect(screen.getByText("Exam B")).toBeInTheDocument();
      expect(screen.getByText("4 students")).toBeInTheDocument();
      expect(screen.getByText("STU01")).toBeInTheDocument();
    });
  });
});
