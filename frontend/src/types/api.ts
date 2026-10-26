/**
 * Data contracts and response interfaces mirroring the SLOTWISE Phase 4 FastAPI schemas.
 */

export interface HealthResponse {
  status: "healthy" | "degraded" | string;
  database: "connected" | "unreachable" | string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface Exam {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  semester?: string | null;
  duration?: number | null;
  created_at: string;
  updated_at: string;
  enrolment_count: number;
}

export interface ExamCreate {
  code: string;
  name: string;
  department?: string;
  semester?: string;
  duration?: number;
}

export interface ExamUpdate {
  code?: string;
  name?: string;
  department?: string;
  semester?: string;
  duration?: number;
}

export interface ExamListResponse {
  items: Exam[];
  total: number;
  skip: number;
  limit: number;
}

export interface Student {
  id: string;
  student_id: string;
  display_name?: string | null;
  created_at: string;
  updated_at: string;
  enrolment_count: number;
}

export interface StudentCreate {
  student_id: string;
  display_name?: string;
}

export interface StudentUpdate {
  student_id?: string;
  display_name?: string;
}

export interface StudentListResponse {
  items: Student[];
  total: number;
  skip: number;
  limit: number;
}

export interface Enrolment {
  id: string;
  student_id: string;
  student_identifier: string;
  student_name?: string | null;
  exam_id: string;
  exam_code: string;
  exam_name: string;
  created_at: string;
}

export interface EnrolmentCreate {
  student_id: string;
  exam_id: string;
}

export interface EnrolmentListResponse {
  items: Enrolment[];
  total: number;
  skip: number;
  limit: number;
}

export interface GraphVertex {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  semester?: string | null;
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  shared_students: string[];
}

export interface ConflictGraphResponse {
  vertex_count: number;
  edge_count: number;
  vertices: GraphVertex[];
  edges: GraphEdge[];
  degrees: Record<string, number>;
  isolated_examinations: string[];
  adjacency: Record<string, string[]>;
}

export interface SampleDataLoadRequest {
  reset?: boolean;
  dataset_name?: string;
}

export interface SampleDataSummaryResponse {
  status: "success" | "skipped" | string;
  message: string;
  dataset_name: string;
  exams_created: number;
  students_created: number;
  enrolments_created: number;
  conflict_edges_detected: number;
  isolated_examinations: string[];
}

export interface ApiError {
  message: string;
  status: number;
  detail?: string | Record<string, unknown>;
  code?: string;
}
