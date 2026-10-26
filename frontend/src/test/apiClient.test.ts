import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../services/apiClient";

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches health status successfully", async () => {
    const mockHealth = {
      status: "healthy",
      database: "connected",
      app_name: "SLOTWISE Timetable API",
      version: "0.1.0",
      environment: "development",
      timestamp: "2026-10-26T12:00:00Z",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockHealth,
    });

    const result = await apiClient.getHealth();
    expect(result).toEqual(mockHealth);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("lists examinations with query params", async () => {
    const mockExams = {
      items: [
        {
          id: "ex-1",
          code: "CS101",
          name: "Intro to CS",
          department: "CS",
          semester: "Fall 2026",
          duration: 120,
          created_at: "2026-10-26T00:00:00Z",
          updated_at: "2026-10-26T00:00:00Z",
          enrolment_count: 5,
        },
      ],
      total: 1,
      skip: 0,
      limit: 25,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockExams,
    });

    const result = await apiClient.exams.list({ search: "CS101", skip: 0, limit: 25 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe("CS101");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/exams\?.*search=CS101/),
      expect.anything()
    );
  });

  it("creates an examination with POST body", async () => {
    const newExam = {
      id: "ex-2",
      code: "MATH201",
      name: "Calculus II",
      created_at: "2026-10-26T00:00:00Z",
      updated_at: "2026-10-26T00:00:00Z",
      enrolment_count: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => newExam,
    });

    const result = await apiClient.exams.create({ code: "MATH201", name: "Calculus II" });
    expect(result.code).toBe("MATH201");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/exams"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "MATH201", name: "Calculus II" }),
      })
    );
  });

  it("handles 409 Conflict errors gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        detail: "Examination with code 'CS101' already exists.",
      }),
    });

    await expect(
      apiClient.exams.create({ code: "CS101", name: "Duplicate" })
    ).rejects.toMatchObject({
      status: 409,
      message: "Examination with code 'CS101' already exists.",
    });
  });

  it("handles 422 Validation errors with detailed field message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          { loc: ["body", "code"], msg: "Field required", type: "value_error.missing" },
        ],
      }),
    });

    await expect(
      apiClient.exams.create({ code: "", name: "No Code" })
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("code: Field required"),
    });
  });

  it("manages enrolments and handles duplicate enrolment error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        detail: "Student is already enrolled in this examination.",
      }),
    });

    await expect(
      apiClient.enrolments.create({ student_id: "s1", exam_id: "e1" })
    ).rejects.toMatchObject({
      status: 409,
      message: "Student is already enrolled in this examination.",
    });
  });

  it("fetches conflict graph metadata", async () => {
    const mockGraph = {
      vertex_count: 2,
      edge_count: 1,
      vertices: [
        { id: "e1", code: "CS101", name: "CS 101", degree: 1 },
        { id: "e2", code: "MATH101", name: "Math 101", degree: 1 },
      ],
      edges: [
        { source: "CS101", target: "MATH101", weight: 3, shared_students: ["S01", "S02", "S03"] },
      ],
      degrees: { CS101: 1, MATH101: 1 },
      isolated_examinations: [],
      adjacency: { CS101: ["MATH101"], MATH101: ["CS101"] },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGraph,
    });

    const res = await apiClient.graph.getConflicts();
    expect(res.vertex_count).toBe(2);
    expect(res.edges[0].weight).toBe(3);
    expect(res.edges[0].shared_students).toHaveLength(3);
  });

  it("loads sample dataset with reset toggle", async () => {
    const mockSummary = {
      status: "success",
      message: "Sample dataset loaded",
      dataset_name: "Engineering & Computer Science (Realistic)",
      exams_created: 10,
      students_created: 20,
      enrolments_created: 50,
      conflict_edges_detected: 18,
      isolated_examinations: ["CIV101"],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSummary,
    });

    const res = await apiClient.sampleData.load({ reset: true });
    expect(res.status).toBe("success");
    expect(res.exams_created).toBe(10);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/sample-data"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reset: true }),
      })
    );
  });

  it("handles network failure / connection refused", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiClient.getHealth()).rejects.toMatchObject({
      status: 0,
      message: "Unable to connect to the SLOTWISE backend server. Please check if the API is running.",
    });
  });
});
