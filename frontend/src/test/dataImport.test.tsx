import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { DataImportPage } from "@/routes/DataImportPage";
import { apiClient } from "@/services/apiClient";
import type {
  ImportPreviewResponse,
  ImportCommitResponse,
  SampleDatasetPreviewResponse,
  SampleDatasetLoadResponse,
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

const mockPreviewResponse: ImportPreviewResponse = {
  preview_id: "preview-123456",
  import_type: "exams",
  filename: "exams_batch.csv",
  total_rows: 3,
  valid_rows: 2,
  invalid_rows: 1,
  warning_rows: 0,
  can_commit_atomic: false,
  can_commit_valid_only: true,
  column_headers: ["exam_code", "subject_name", "duration"],
  missing_required_headers: [],
  summary: "Parsed 3 rows: 2 valid, 1 error.",
  rows: [
    {
      row_number: 2,
      data: { exam_code: "CS101", subject_name: "Intro to CS", duration: 180 },
      status: "valid",
      errors: [],
      warnings: [],
    },
    {
      row_number: 3,
      data: { exam_code: "MATH101", subject_name: "Calculus", duration: 150 },
      status: "valid",
      errors: [],
      warnings: [],
    },
    {
      row_number: 4,
      data: { exam_code: "", subject_name: "Broken Course", duration: 120 },
      status: "error",
      errors: ["Missing required exam_code"],
      warnings: [],
    },
  ],
};

const mockCommitResponse: ImportCommitResponse = {
  import_type: "exams",
  strategy: "valid_only",
  total_processed: 3,
  inserted_count: 2,
  skipped_count: 0,
  rejected_count: 1,
  message: "Successfully imported 2 exams records. Skipped: 0, Rejected: 1.",
  resulting_graph_vertices: 2,
  resulting_graph_edges: 0,
  graph_fingerprint: "abc123sha256fingerprint",
  is_schedule_stale: true,
};

const mockSamplePreview: SampleDatasetPreviewResponse = {
  name: "Standard University Science & Engineering",
  description: "A realistic 15-examination dataset modeling undergraduate engineering.",
  exam_count: 15,
  student_count: 36,
  enrolment_count: 85,
  projected_conflicts: 38,
  projected_isolated_exams: ["ENG101"],
  sample_exams: [
    { code: "CS101", name: "Introduction to Computer Science", department: "Computer Science", duration: 180 },
    { code: "MATH101", name: "Single Variable Calculus", department: "Mathematics", duration: 150 },
  ],
  sample_students: [
    { id: "S1001", name: "Ada Lovelace" },
    { id: "S1002", name: "Alan Turing" },
  ],
};

const mockSampleLoadResponse: SampleDatasetLoadResponse = {
  status: "success",
  mode: "append",
  message: "Sample data appended: 15 exams, 36 students, 85 enrolments added.",
  exams_created: 15,
  students_created: 36,
  enrolments_created: 85,
  graph_vertices: 15,
  graph_edges: 38,
  graph_fingerprint: "fingerprint-xyz",
};

describe("Phase 9: Data Import & Sample Dataset Studio UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient.imports, "preview").mockResolvedValue(mockPreviewResponse);
    vi.spyOn(apiClient.imports, "commit").mockResolvedValue(mockCommitResponse);
    vi.spyOn(apiClient.imports, "getTemplateUrl").mockImplementation(
      (type) => `/api/imports/templates/${type}`
    );
    vi.spyOn(apiClient.imports, "getReportUrl").mockImplementation(
      (id) => `/api/imports/reports/${id}`
    );
    vi.spyOn(apiClient.imports, "sampleDatasetPreview").mockResolvedValue(mockSamplePreview);
    vi.spyOn(apiClient.imports, "sampleDatasetLoad").mockResolvedValue(mockSampleLoadResponse);
  });

  it("renders page header, tabs, and dataset selection cards", () => {
    renderWithProviders(<DataImportPage />);

    expect(screen.getByText("Data Import & Sample Studio")).toBeInTheDocument();
    expect(screen.getByText("CSV Importer")).toBeInTheDocument();
    expect(screen.getByText("Sample Studio")).toBeInTheDocument();
    expect(screen.getByText("Template Specs")).toBeInTheDocument();

    // Step 1 dataset types
    expect(screen.getByText("Examinations")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Course Enrolments")).toBeInTheDocument();
  });

  it("allows switching dataset type to students or enrolments", () => {
    renderWithProviders(<DataImportPage />);

    const studentsCard = screen.getByText("Students").closest("button");
    expect(studentsCard).toBeInTheDocument();
    fireEvent.click(studentsCard!);

    expect(screen.getByText(/Drag and drop your students CSV file here/i)).toBeInTheDocument();
  });

  it("renders template specs tab with download links", () => {
    renderWithProviders(<DataImportPage />);

    const templatesTabBtn = screen.getByText("Template Specs");
    fireEvent.click(templatesTabBtn);

    expect(screen.getByText("Examinations Schema")).toBeInTheDocument();
    expect(screen.getByText("Students Schema")).toBeInTheDocument();
    expect(screen.getByText("Enrolments Schema")).toBeInTheDocument();
    expect(screen.getByText("Download exams_template.csv")).toBeInTheDocument();
    expect(screen.getByText("Download students_template.csv")).toBeInTheDocument();
    expect(screen.getByText("Download enrolments_template.csv")).toBeInTheDocument();
  });

  it("validates uploaded CSV and renders row preview table with diagnostic badges", async () => {
    renderWithProviders(<DataImportPage />);

    // Mock file upload
    const file = new File(["exam_code,subject_name\nCS101,Intro CS"], "exams.csv", {
      type: "text/csv",
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Validate button should appear
    const validateBtn = screen.getByText("Validate File");
    expect(validateBtn).toBeInTheDocument();
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(apiClient.imports.preview).toHaveBeenCalledWith("exams", file);
    });

    // Metric summaries should render
    expect(await screen.findByText("Step 3: Validation Preview & Audit Report")).toBeInTheDocument();
    expect(screen.getByText("Total Rows")).toBeInTheDocument();
    expect(screen.getByText("Valid Records")).toBeInTheDocument();
    expect(screen.getByText("Fatal Errors")).toBeInTheDocument();

    // Table rows should render
    expect(screen.getByText(/exam_code=CS101/)).toBeInTheDocument();
    expect(screen.getByText(/exam_code=MATH101/)).toBeInTheDocument();
    expect(screen.getByText("Missing required exam_code")).toBeInTheDocument();
  });

  it("commits valid records using valid-only strategy and renders stale schedule alert", async () => {
    renderWithProviders(<DataImportPage />);

    // Upload & validate file
    const file = new File(["content"], "exams.csv", { type: "text/csv" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Validate File"));

    // Wait for preview
    await screen.findByText("Step 4: Select Commit Strategy & Commit");

    // Atomic should be disabled because 1 error is present
    const atomicRadio = screen.getByLabelText(/Atomic All-or-Nothing/i) as HTMLInputElement;
    expect(atomicRadio.disabled).toBe(true);

    // Commit button
    const commitBtn = screen.getByText(/Commit 2 Records to Database/i);
    expect(commitBtn).toBeInTheDocument();
    fireEvent.click(commitBtn);

    await waitFor(() => {
      expect(apiClient.imports.commit).toHaveBeenCalledWith("exams", {
        preview_id: "preview-123456",
        import_type: "exams",
        strategy: "valid_only",
      });
    });

    // Verify commit result banner
    expect(await screen.findByText("Import Batch Successfully Committed")).toBeInTheDocument();
    expect(screen.getByText(/Existing Timetables Require Recalculation/i)).toBeInTheDocument();
    expect(screen.getByText("Explore Conflict Graph")).toBeInTheDocument();
  });

  it("loads sample dataset in studio and renders benchmark characteristics", async () => {
    renderWithProviders(<DataImportPage />);

    // Click Sample Studio tab
    fireEvent.click(screen.getByText("Sample Studio"));

    await waitFor(() => {
      expect(apiClient.imports.sampleDatasetPreview).toHaveBeenCalled();
    });

    expect(screen.getByText("Standard University Benchmark Dataset")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument(); // exams
    expect(screen.getByText("36")).toBeInTheDocument(); // students
    expect(screen.getByText("85")).toBeInTheDocument(); // enrolments
    expect(screen.getAllByText("ENG101").length).toBeGreaterThan(0); // isolated

    // Click Append Sample Dataset button
    const appendBtn = screen.getByText("Append Sample Dataset");
    fireEvent.click(appendBtn);

    await waitFor(() => {
      expect(apiClient.imports.sampleDatasetLoad).toHaveBeenCalledWith("append");
    });

    expect(await screen.findByText("Sample Dataset Loaded Successfully")).toBeInTheDocument();
  });
});
