/**
 * Centralized, typed HTTP client for the SLOTWISE FastAPI backend.
 */

import {
  ApiError,
  ConflictGraphResponse,
  Enrolment,
  EnrolmentCreate,
  EnrolmentListResponse,
  Exam,
  ExamCreate,
  ExamListResponse,
  ExamUpdate,
  HealthResponse,
  SampleDataLoadRequest,
  SampleDataSummaryResponse,
  ScheduleCompareRequest,
  ScheduleCompareResponse,
  ScheduleCreateRequest,
  ScheduleDetailResponse,
  ScheduleRunRequest,
  ScheduleRunResponse,
  ScheduleSummaryResponse,
  ScheduleUpdateRequest,
  Student,
  StudentCreate,
  StudentListResponse,
  StudentUpdate,
} from "@/types/api";

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || "/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    // Strip trailing slash if present
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (options.body && typeof options.body === "string") {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      let data: any;
      const contentType = response.headers?.get ? response.headers.get("content-type") : "application/json";
      const isJson = contentType ? contentType.includes("application/json") : true;

      try {
        if (typeof response.json === "function" && isJson) {
          data = await response.json();
        } else if (typeof response.text === "function") {
          data = await response.text();
        }
      } catch {
        data = null;
      }

      if (!response.ok) {
        let errorMessage = "An unexpected error occurred.";
        if (typeof data === "object" && data !== null) {
          if (typeof data.detail === "string") {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            // FastAPI 422 validation error array
            errorMessage = data.detail
              .map((err: { msg?: string; loc?: string[] }) =>
                err.loc ? `${err.loc.slice(-1)}: ${err.msg}` : err.msg
              )
              .join("; ");
          }
        } else if (typeof data === "string" && data.trim()) {
          errorMessage = data;
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          detail: data,
          code: `HTTP_${response.status}`,
        };
        throw error;
      }

      return data as T;
    } catch (err: unknown) {
      if (typeof (err as any)?.status === "number" && (err as any)?.code !== undefined) {
        throw err;
      }
      if ((err as Error)?.name === "AbortError") {
        throw err;
      }
      // Network or connection failure
      const networkError: ApiError = {
        message: "Unable to connect to the SLOTWISE backend server. Please check if the API is running.",
        status: 0,
        code: "NETWORK_ERROR",
        detail: (err as Error)?.message,
      };
      throw networkError;
    }
  }

  // Health Endpoint
  public async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health", {
      method: "GET",
      signal,
    });
  }

  // Examinations API
  public readonly exams = {
    list: async (
      params?: { skip?: number; limit?: number; search?: string },
      signal?: AbortSignal
    ): Promise<ExamListResponse> => {
      const query = new URLSearchParams();
      if (params?.skip !== undefined) query.set("skip", params.skip.toString());
      if (params?.limit !== undefined) query.set("limit", params.limit.toString());
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return this.request<ExamListResponse>(`/exams${qs ? `?${qs}` : ""}`, {
        method: "GET",
        signal,
      });
    },

    get: async (id: string, signal?: AbortSignal): Promise<Exam> => {
      return this.request<Exam>(`/exams/${encodeURIComponent(id)}`, {
        method: "GET",
        signal,
      });
    },

    create: async (payload: ExamCreate): Promise<Exam> => {
      return this.request<Exam>("/exams", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    update: async (id: string, payload: ExamUpdate): Promise<Exam> => {
      return this.request<Exam>(`/exams/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    delete: async (id: string): Promise<{ message: string; deleted_id: string; deleted_code: string; enrolments_removed: number }> => {
      return this.request(`/exams/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  // Students API
  public readonly students = {
    list: async (
      params?: { skip?: number; limit?: number; search?: string },
      signal?: AbortSignal
    ): Promise<StudentListResponse> => {
      const query = new URLSearchParams();
      if (params?.skip !== undefined) query.set("skip", params.skip.toString());
      if (params?.limit !== undefined) query.set("limit", params.limit.toString());
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return this.request<StudentListResponse>(`/students${qs ? `?${qs}` : ""}`, {
        method: "GET",
        signal,
      });
    },

    get: async (id: string, signal?: AbortSignal): Promise<Student> => {
      return this.request<Student>(`/students/${encodeURIComponent(id)}`, {
        method: "GET",
        signal,
      });
    },

    create: async (payload: StudentCreate): Promise<Student> => {
      return this.request<Student>("/students", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    update: async (id: string, payload: StudentUpdate): Promise<Student> => {
      return this.request<Student>(`/students/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    delete: async (id: string): Promise<{ message: string; deleted_id: string; deleted_student_id: string; enrolments_removed: number }> => {
      return this.request(`/students/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  // Enrolments API
  public readonly enrolments = {
    list: async (
      params?: { exam_id?: string; student_id?: string; skip?: number; limit?: number },
      signal?: AbortSignal
    ): Promise<EnrolmentListResponse> => {
      const query = new URLSearchParams();
      if (params?.exam_id) query.set("exam_id", params.exam_id);
      if (params?.student_id) query.set("student_id", params.student_id);
      if (params?.skip !== undefined) query.set("skip", params.skip.toString());
      if (params?.limit !== undefined) query.set("limit", params.limit.toString());
      const qs = query.toString();
      return this.request<EnrolmentListResponse>(`/enrolments${qs ? `?${qs}` : ""}`, {
        method: "GET",
        signal,
      });
    },

    create: async (payload: EnrolmentCreate): Promise<Enrolment> => {
      return this.request<Enrolment>("/enrolments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    delete: async (id: string): Promise<{ message: string; deleted_id: string; student_id: string; exam_code: string }> => {
      return this.request(`/enrolments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };

  // Conflict Graph API
  public readonly graph = {
    getConflicts: async (signal?: AbortSignal): Promise<ConflictGraphResponse> => {
      return this.request<ConflictGraphResponse>("/graph/conflicts", {
        method: "GET",
        signal,
      });
    },
  };

  // Sample Data API
  public readonly sampleData = {
    load: async (payload: SampleDataLoadRequest = {}): Promise<SampleDataSummaryResponse> => {
      return this.request<SampleDataSummaryResponse>("/sample-data", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };

  // Scheduling & Algorithm Laboratory API
  public readonly scheduling = {
    run: async (
      payload: ScheduleRunRequest,
      signal?: AbortSignal
    ): Promise<ScheduleRunResponse> => {
      return this.request<ScheduleRunResponse>("/scheduling/run", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      });
    },

    compare: async (
      payload: ScheduleCompareRequest,
      signal?: AbortSignal
    ): Promise<ScheduleCompareResponse> => {
      return this.request<ScheduleCompareResponse>("/scheduling/compare", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      });
    },

    listRuns: async (signal?: AbortSignal): Promise<ScheduleRunResponse[]> => {
      return this.request<ScheduleRunResponse[]>("/scheduling/runs", {
        method: "GET",
        signal,
      });
    },

    getRun: async (
      runId: string,
      signal?: AbortSignal
    ): Promise<ScheduleRunResponse> => {
      return this.request<ScheduleRunResponse>(
        `/scheduling/runs/${encodeURIComponent(runId)}`,
        {
          method: "GET",
          signal,
        }
      );
    },
  };

  // Timetable Schedule Management API (Phase 8)
  public readonly schedules = {
    save: async (
      payload: ScheduleCreateRequest,
      signal?: AbortSignal
    ): Promise<ScheduleDetailResponse> => {
      return this.request<ScheduleDetailResponse>("/schedules", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      });
    },

    list: async (signal?: AbortSignal): Promise<ScheduleSummaryResponse[]> => {
      return this.request<ScheduleSummaryResponse[]>("/schedules", {
        method: "GET",
        signal,
      });
    },

    get: async (
      scheduleId: string,
      signal?: AbortSignal
    ): Promise<ScheduleDetailResponse> => {
      return this.request<ScheduleDetailResponse>(
        `/schedules/${encodeURIComponent(scheduleId)}`,
        {
          method: "GET",
          signal,
        }
      );
    },

    update: async (
      scheduleId: string,
      payload: ScheduleUpdateRequest,
      signal?: AbortSignal
    ): Promise<ScheduleDetailResponse> => {
      return this.request<ScheduleDetailResponse>(
        `/schedules/${encodeURIComponent(scheduleId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
          signal,
        }
      );
    },

    delete: async (
      scheduleId: string,
      signal?: AbortSignal
    ): Promise<{ message: string; id: string }> => {
      return this.request<{ message: string; id: string }>(
        `/schedules/${encodeURIComponent(scheduleId)}`,
        {
          method: "DELETE",
          signal,
        }
      );
    },

    getExportCsvUrl: (scheduleId: string): string => {
      return `${this.baseUrl}/schedules/${encodeURIComponent(scheduleId)}/export/csv`;
    },
  };
}

export const apiClient = new ApiClient();

