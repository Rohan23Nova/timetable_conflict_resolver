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

export interface ValidationReport {
  is_valid: boolean;
  errors: string[];
  checks_performed: string[];
  conflicts: [string, string, number][];
  missing_examinations: string[];
  unknown_examinations: string[];
  invalid_color_values: [string, unknown][];
  out_of_range_colors: [string, number][];
  metadata: Record<string, unknown>;
}

export interface SlotAssignmentDetail {
  exam_code: string;
  exam_name: string;
  slot: number;
  department?: string | null;
  semester?: string | null;
  degree: number;
}

export interface ScheduleRunRequest {
  algorithm: "greedy" | "backtracking";
  ordering_strategy?: "descending_degree" | "natural";
  max_colors?: number | null;
  max_nodes?: number | null;
  timeout_seconds?: number | null;
}

export interface ScheduleCompareRequest {
  ordering_strategy?: "descending_degree" | "natural";
  max_colors?: number | null;
  max_nodes?: number | null;
  timeout_seconds?: number | null;
}

export interface ScheduleRunResponse {
  run_id: string;
  algorithm: "greedy" | "backtracking" | string;
  ordering_strategy: string;
  max_colors?: number | null;
  status: "COMPLETED" | "INFEASIBLE" | "RESOURCE_LIMITED" | "INCOMPLETE" | "INVALID" | string;
  is_complete: boolean;
  is_valid: boolean;
  slots_used: number;
  slot_assignments: Record<string, number>;
  slot_details: SlotAssignmentDetail[];
  slots_summary: Record<number, string[]>;
  execution_time_ms: number;
  vertex_count: number;
  edge_count: number;
  validation_report: ValidationReport;
  statistics: Record<string, unknown>;
  explanation: string;
  created_at: string;
}

export interface ScheduleCompareResponse {
  compare_id: string;
  timestamp: string;
  vertex_count: number;
  edge_count: number;
  max_colors_constraint?: number | null;
  greedy_result: ScheduleRunResponse;
  backtracking_result: ScheduleRunResponse;
  summary_explanation: string;
}

export interface ScheduleDateConfig {
  start_date?: string | null;
  slots_per_day?: number;
  session_times?: string[];
  slot_duration_minutes?: number;
  slot_break_minutes?: number;
  skip_weekends?: boolean;
}

export interface ScheduleCreateRequest {
  name: string;
  description?: string | null;
  algorithm: string;
  parameters?: Record<string, unknown>;
  slot_assignments: Record<string, number>;
  slot_details: SlotAssignmentDetail[];
  slots_used: number;
  is_valid: boolean;
  validation_report: ValidationReport;
  date_config?: ScheduleDateConfig | null;
}

export interface ScheduleUpdateRequest {
  name?: string;
  description?: string | null;
  date_config?: ScheduleDateConfig | null;
}

export interface ScheduleSummaryResponse {
  id: string;
  name: string;
  description?: string | null;
  algorithm: string;
  slots_used: number;
  exam_count: number;
  is_valid: boolean;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleDetailResponse {
  id: string;
  name: string;
  description?: string | null;
  algorithm: string;
  parameters: Record<string, unknown>;
  slot_assignments: Record<string, number>;
  slot_details: SlotAssignmentDetail[];
  slots_summary: Record<number, string[]>;
  slots_used: number;
  is_valid: boolean;
  validation_report: ValidationReport;
  graph_fingerprint: string;
  is_stale: boolean;
  current_graph_vertex_count?: number | null;
  current_graph_edge_count?: number | null;
  date_config?: ScheduleDateConfig | null;
  created_at: string;
  updated_at: string;
}

// Phase 9 Data Import & Sample Dataset Types
export type ImportType = 'exams' | 'students' | 'enrolments';
export type ImportStrategy = 'atomic' | 'valid_only';
export type RowValidationStatus = 'valid' | 'error' | 'warning';

export interface ImportRowValidation {
  row_number: number;
  data: Record<string, unknown>;
  status: RowValidationStatus;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewResponse {
  preview_id: string;
  import_type: ImportType;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  warning_rows: number;
  can_commit_atomic: boolean;
  can_commit_valid_only: boolean;
  column_headers: string[];
  missing_required_headers: string[];
  rows: ImportRowValidation[];
  summary: string;
}

export interface ImportCommitRequest {
  preview_id: string;
  import_type: ImportType;
  strategy: ImportStrategy;
}

export interface ImportCommitResponse {
  import_type: ImportType;
  strategy: ImportStrategy;
  total_processed: number;
  inserted_count: number;
  skipped_count: number;
  rejected_count: number;
  message: string;
  resulting_graph_vertices: number;
  resulting_graph_edges: number;
  graph_fingerprint: string;
  is_schedule_stale: boolean;
}

export interface SampleDatasetPreviewResponse {
  name: string;
  description: string;
  exam_count: number;
  student_count: number;
  enrolment_count: number;
  projected_conflicts: number;
  projected_isolated_exams: string[];
  sample_exams: Record<string, unknown>[];
  sample_students: Record<string, unknown>[];
}

export interface SampleDatasetLoadResponse {
  status: string;
  mode: string;
  message: string;
  exams_created: number;
  students_created: number;
  enrolments_created: number;
  graph_vertices: number;
  graph_edges: number;
  graph_fingerprint: string;
}

