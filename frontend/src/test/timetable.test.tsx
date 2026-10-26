import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { TimetableCalendarPage } from "@/routes/TimetableCalendarPage";
import { TimetableHistoryPage } from "@/routes/TimetableHistoryPage";
import { SaveScheduleDialog } from "@/components/timetable/SaveScheduleDialog";
import { apiClient } from "@/services/apiClient";
import type {
  ScheduleDetailResponse,
  ScheduleRunResponse,
  ScheduleSummaryResponse,
} from "@/types/api";

const mockScheduleSummary: ScheduleSummaryResponse = {
  id: "sched-101",
  name: "Fall 2026 Official Timetable",
  description: "Approved by academic council",
  algorithm: "greedy",
  slots_used: 3,
  exam_count: 3,
  is_valid: true,
  is_stale: false,
  created_at: "2026-12-01T10:00:00Z",
  updated_at: "2026-12-01T10:00:00Z",
};

const mockScheduleDetail: ScheduleDetailResponse = {
  id: "sched-101",
  name: "Fall 2026 Official Timetable",
  description: "Approved by academic council",
  algorithm: "greedy",
  parameters: { ordering_strategy: "descending_degree" },
  slot_assignments: { CS101: 1, MATH101: 2, PHYS101: 3 },
  slot_details: [
    {
      exam_code: "CS101",
      exam_name: "Intro to CS",
      slot: 1,
      department: "CS",
      semester: "1",
      degree: 2,
    },
    {
      exam_code: "MATH101",
      exam_name: "Calculus I",
      slot: 2,
      department: "Math",
      semester: "1",
      degree: 2,
    },
    {
      exam_code: "PHYS101",
      exam_name: "Physics I",
      slot: 3,
      department: "Physics",
      semester: "1",
      degree: 2,
    },
  ],
  slots_summary: { 1: ["CS101"], 2: ["MATH101"], 3: ["PHYS101"] },
  slots_used: 3,
  is_valid: true,
  validation_report: {
    is_valid: true,
    errors: [],
    checks_performed: ["check_conflicts"],
    conflicts: [],
    missing_examinations: [],
    unknown_examinations: [],
    invalid_color_values: [],
    out_of_range_colors: [],
    metadata: {},
  },
  graph_fingerprint: "hash12345",
  is_stale: false,
  date_config: {
    start_date: "2026-12-01",
    slots_per_day: 2,
    session_times: ["09:00 - 12:00", "14:00 - 17:00"],
    slot_duration_minutes: 180,
    slot_break_minutes: 120,
    skip_weekends: true,
  },
  created_at: "2026-12-01T10:00:00Z",
  updated_at: "2026-12-01T10:00:00Z",
};

describe("Phase 8: Timetable Management & Calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TimetableCalendarPage", () => {
    it("renders empty state when no saved schedules exist", async () => {
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([]);

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable"]}>
              <TimetableCalendarPage />
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText("No Saved Timetables Yet")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Open Algorithm Laboratory/i })
      ).toBeInTheDocument();
    });

    it("renders schedule details, slots metrics, and courses in Slot View", async () => {
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([mockScheduleSummary]);
      vi.spyOn(apiClient.schedules, "get").mockResolvedValueOnce(mockScheduleDetail);

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable/sched-101"]}>
              <Routes>
                <Route path="/app/timetable/:scheduleId" element={<TimetableCalendarPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      // Verify header and metrics
      expect(await screen.findByText("Timetable Calendar & Schedule Management")).toBeInTheDocument();
      expect(screen.getByText("CS101")).toBeInTheDocument();
      expect(screen.getByText("MATH101")).toBeInTheDocument();
      expect(screen.getByText("PHYS101")).toBeInTheDocument();
      expect(screen.getByText("courses")).toBeInTheDocument();
    });

    it("shows stale snapshot warning banner when is_stale is true", async () => {
      const staleDetail: ScheduleDetailResponse = {
        ...mockScheduleDetail,
        is_stale: true,
      };
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([
        { ...mockScheduleSummary, is_stale: true },
      ]);
      vi.spyOn(apiClient.schedules, "get").mockResolvedValueOnce(staleDetail);

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable/sched-101"]}>
              <Routes>
                <Route path="/app/timetable/:scheduleId" element={<TimetableCalendarPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText(/Source Data Modified — Historical Snapshot Preserved/i)).toBeInTheDocument();
    });

    it("allows switching to Table view", async () => {
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([mockScheduleSummary]);
      vi.spyOn(apiClient.schedules, "get").mockResolvedValueOnce(mockScheduleDetail);

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable/sched-101"]}>
              <Routes>
                <Route path="/app/timetable/:scheduleId" element={<TimetableCalendarPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      await screen.findByText("Timetable Calendar & Schedule Management");

      const tableBtn = screen.getByRole("button", { name: /Table/i });
      fireEvent.click(tableBtn);

      // Table columns should now be present
      expect(screen.getByText("Course Code")).toBeInTheDocument();
      expect(screen.getByText("Course Title")).toBeInTheDocument();
      expect(screen.getByText("Session Window")).toBeInTheDocument();
    });

    it("triggers CSV export download", async () => {
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([mockScheduleSummary]);
      vi.spyOn(apiClient.schedules, "get").mockResolvedValueOnce(mockScheduleDetail);
      const csvSpy = vi
        .spyOn(apiClient.schedules, "getExportCsvUrl")
        .mockReturnValue("/api/schedules/sched-101/export/csv");

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable/sched-101"]}>
              <Routes>
                <Route path="/app/timetable/:scheduleId" element={<TimetableCalendarPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      await screen.findByText("Timetable Calendar & Schedule Management");

      const exportBtn = screen.getByRole("button", { name: /Export CSV/i });
      fireEvent.click(exportBtn);

      expect(csvSpy).toHaveBeenCalledWith("sched-101");
    });
  });

  describe("TimetableHistoryPage", () => {
    it("renders history table and allows viewing", async () => {
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([mockScheduleSummary]);

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable/history"]}>
              <TimetableHistoryPage />
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText("Saved Timetable Schedules")).toBeInTheDocument();
      expect(screen.getByText("Fall 2026 Official Timetable")).toBeInTheDocument();
      expect(screen.getByText("3 Slots")).toBeInTheDocument();
      expect(screen.getByText("3 courses")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /View/i })).toBeInTheDocument();
    });

    it("opens delete confirmation dialog and warns about course preservation", async () => {
      vi.spyOn(apiClient.schedules, "list").mockResolvedValueOnce([mockScheduleSummary]);

      render(
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/app/timetable/history"]}>
              <TimetableHistoryPage />
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      );

      await screen.findByText("Saved Timetable Schedules");

      const deleteBtn = screen.getByTitle("Delete Schedule");
      fireEvent.click(deleteBtn);

      expect(screen.getByText(/Delete Saved Timetable\?/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Underlying examinations, student records, and enrolments will remain completely intact/i)
      ).toBeInTheDocument();
    });
  });

  describe("SaveScheduleDialog", () => {
    const mockRunResult: ScheduleRunResponse = {
      run_id: "run-abc",
      algorithm: "greedy",
      ordering_strategy: "descending_degree",
      max_colors: null,
      status: "COMPLETED",
      is_complete: true,
      is_valid: true,
      slots_used: 2,
      slot_assignments: { CS101: 1, MATH101: 2 },
      slot_details: [
        {
          exam_code: "CS101",
          exam_name: "Intro to CS",
          slot: 1,
          degree: 1,
        },
        {
          exam_code: "MATH101",
          exam_name: "Calculus I",
          slot: 2,
          degree: 1,
        },
      ],
      slots_summary: { 1: ["CS101"], 2: ["MATH101"] },
      execution_time_ms: 2.5,
      vertex_count: 2,
      edge_count: 1,
      validation_report: {
        is_valid: true,
        errors: [],
        checks_performed: ["check_conflicts"],
        conflicts: [],
        missing_examinations: [],
        unknown_examinations: [],
        invalid_color_values: [],
        out_of_range_colors: [],
        metadata: {},
      },
      statistics: {},
      explanation: "Greedy algorithm successfully assigned conflict-free slots.",
      created_at: "2026-12-01T10:00:00Z",
    };

    it("pre-fills title and submits schedule to backend", async () => {
      const saveSpy = vi
        .spyOn(apiClient.schedules, "save")
        .mockResolvedValueOnce(mockScheduleDetail);
      const onSavedMock = vi.fn();

      render(
        <ThemeProvider>
          <ToastProvider>
            <SaveScheduleDialog
              isOpen={true}
              onClose={() => {}}
              runResult={mockRunResult}
              onSaved={onSavedMock}
            />
          </ToastProvider>
        </ThemeProvider>
      );

      expect(screen.getByText("Save Verified Timetable Schedule")).toBeInTheDocument();
      expect(screen.getByText("Independently Verified (0 Conflicts)")).toBeInTheDocument();

      const saveSubmitBtn = screen.getByRole("button", { name: /Save Timetable/i });
      fireEvent.click(saveSubmitBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledTimes(1);
        expect(onSavedMock).toHaveBeenCalledWith(mockScheduleDetail);
      });
    });
  });
});
