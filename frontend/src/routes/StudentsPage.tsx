import React, { useState, useEffect, useCallback } from "react";
import {
  Student as StudentIcon,
  Plus,
  PencilSimple,
  Trash,
  ArrowClockwise,
  WarningCircle,
  BookOpen,
  LinkBreak,
} from "@phosphor-icons/react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, SearchInput } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/services/apiClient";
import { Enrolment, Exam, Student, StudentCreate, StudentUpdate } from "@/types/api";

const PAGE_SIZE = 25;

export const StudentsPage: React.FC = () => {
  const { addToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Available examinations for enrolment dropdown
  const [allExams, setAllExams] = useState<Exam[]>([]);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isEnrolmentsOpen, setIsEnrolmentsOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Enrolments drawer states
  const [studentEnrolments, setStudentEnrolments] = useState<Enrolment[]>([]);
  const [selectedExamToEnroll, setSelectedExamToEnroll] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrolmentError, setEnrolmentError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    student_id: string;
    display_name: string;
  }>({
    student_id: "",
    display_name: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchStudents = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.students.list(
          {
            skip: page * PAGE_SIZE,
            limit: PAGE_SIZE,
            search: search.trim() || undefined,
          },
          signal
        );
        setStudents(response.items);
        setTotal(response.total);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        const apiErr = err as { message?: string };
        setError(apiErr?.message || "Failed to load student roster.");
      } finally {
        setIsLoading(false);
      }
    },
    [page, search]
  );

  const fetchAllExams = useCallback(async () => {
    try {
      const response = await apiClient.exams.list({ limit: 100 });
      setAllExams(response.items);
    } catch {
      // Fallback silently if exams cannot be preloaded
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudents(controller.signal);
    fetchAllExams();
    return () => controller.abort();
  }, [fetchStudents, fetchAllExams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchStudents();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.student_id.trim()) {
      errors.student_id = "Institutional student identifier is required (e.g. S1001).";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateDialog = () => {
    setFormData({ student_id: "", display_name: "" });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      student_id: student.student_id,
      display_name: student.display_name || "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const openEnrolmentsDialog = async (student: Student) => {
    setSelectedStudent(student);
    setEnrolmentError(null);
    setSelectedExamToEnroll("");
    setIsEnrolmentsOpen(true);
    await loadStudentEnrolments(student.id);
  };

  const loadStudentEnrolments = async (studentUuid: string) => {
    try {
      const response = await apiClient.enrolments.list({ student_id: studentUuid, limit: 100 });
      setStudentEnrolments(response.items);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setEnrolmentError(apiErr?.message || "Failed to load course enrolments.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: StudentCreate = {
        student_id: formData.student_id.trim(),
        display_name: formData.display_name.trim() || undefined,
      };
      await apiClient.students.create(payload);
      addToast({
        title: "Student Registered",
        message: `Student '${payload.student_id}' registered successfully.`,
        type: "success",
      });
      setIsCreateOpen(false);
      await fetchStudents();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      if (apiErr?.status === 409) {
        setFormErrors({ student_id: apiErr.message || "This student ID is already registered." });
      } else {
        setFormErrors({ general: apiErr?.message || "Failed to register student." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: StudentUpdate = {
        student_id: formData.student_id.trim(),
        display_name: formData.display_name.trim() || undefined,
      };
      await apiClient.students.update(selectedStudent.id, payload);
      addToast({
        title: "Student Updated",
        message: `Student '${payload.student_id || selectedStudent.student_id}' updated.`,
        type: "success",
      });
      setIsEditOpen(false);
      await fetchStudents();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      if (apiErr?.status === 409) {
        setFormErrors({ student_id: apiErr.message || "Student ID is already registered." });
      } else {
        setFormErrors({ general: apiErr?.message || "Failed to update student." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.students.delete(selectedStudent.id);
      addToast({
        title: "Student Removed",
        message: `Student '${res.deleted_student_id}' removed along with ${res.enrolments_removed} enrolments.`,
        type: "info",
      });
      setIsDeleteOpen(false);
      await fetchStudents();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      addToast({
        title: "Deletion Failed",
        message: apiErr?.message || "Could not delete student record.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enrolment Actions
  const handleAddEnrolment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedExamToEnroll) return;

    setIsEnrolling(true);
    setEnrolmentError(null);
    try {
      await apiClient.enrolments.create({
        student_id: selectedStudent.id,
        exam_id: selectedExamToEnroll,
      });
      addToast({
        title: "Enrolment Added",
        message: `Student enrolled in examination. Conflict edges updated.`,
        type: "success",
      });
      setSelectedExamToEnroll("");
      await loadStudentEnrolments(selectedStudent.id);
      await fetchStudents();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      setEnrolmentError(apiErr?.message || "Failed to add enrolment.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDropEnrolment = async (enrolmentId: string, examCode: string) => {
    if (!selectedStudent) return;
    try {
      await apiClient.enrolments.delete(enrolmentId);
      addToast({
        title: "Course Dropped",
        message: `Removed '${examCode}' enrolment for ${selectedStudent.student_id}.`,
        type: "info",
      });
      await loadStudentEnrolments(selectedStudent.id);
      await fetchStudents();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setEnrolmentError(apiErr?.message || "Could not drop enrolment.");
    }
  };

  return (
    <div className="space-y-6" data-testid="students-page">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-teal">
              Student Records
            </span>
            <span className="text-content-muted">•</span>
            <span className="text-xs text-content-muted font-mono">{total} registered</span>
          </div>
          <h2 className="text-2xl font-bold text-content-primary tracking-tight">
            Students & Enrolments
          </h2>
          <p className="text-xs text-content-secondary mt-1">
            Manage enrolled student rosters and multi-course registrations generating timetable clashes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStudents()}
            disabled={isLoading}
            leftIcon={<ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateDialog}
            leftIcon={<Plus size={14} weight="bold" />}
          >
            Register Student
          </Button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <Card variant="subtle" className="p-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => {
                setSearch("");
                setPage(0);
              }}
              placeholder="Search by student identifier (e.g. S1001) or student name..."
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Filter
          </Button>
        </form>
      </Card>

      {/* 3. Table / State Area */}
      {isLoading && students.length === 0 ? (
        <Card variant="default" className="p-6 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="text" className="h-10 w-full" />
          ))}
        </Card>
      ) : error ? (
        <ErrorState
          title="Could Not Load Student Roster"
          message={error}
          onRetry={() => fetchStudents()}
        />
      ) : students.length === 0 ? (
        <Card variant="default">
          <CardContent className="py-12">
            <EmptyState
              icon={<StudentIcon size={32} className="text-accent-teal" />}
              title={search ? "No Students Match Query" : "No Students Registered"}
              description={
                search
                  ? `No student record matches '${search}'.`
                  : "Begin by registering students or importing the sample university dataset."
              }
              action={
                search ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setPage(0);
                    }}
                  >
                    Clear Filter
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openCreateDialog}
                    leftIcon={<Plus size={14} weight="bold" />}
                  >
                    Register Student
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card variant="default">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="students-table">
                <thead>
                  <tr className="border-b border-border-subtle bg-subtle/50 text-content-muted font-mono uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Student ID</th>
                    <th className="py-3 px-4 font-semibold">Display Name</th>
                    <th className="py-3 px-4 font-semibold text-center">Courses Enrolled</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-subtle/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-accent-teal">
                        {student.student_id}
                      </td>
                      <td className="py-3 px-4 text-content-primary font-medium">
                        {student.display_name || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEnrolmentsDialog(student)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-subtle hover:bg-subtle/80 border border-border-subtle text-xs transition-colors"
                          title="Manage course enrolments"
                        >
                          <BookOpen size={13} className="text-accent-amber" />
                          <span className="font-mono font-semibold text-content-primary">
                            {student.enrolment_count}
                          </span>
                          <span className="text-[10px] text-content-muted">enrolled</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => openEnrolmentsDialog(student)}
                            leftIcon={<BookOpen size={13} />}
                          >
                            Enrolments
                          </Button>
                          <button
                            type="button"
                            onClick={() => openEditDialog(student)}
                            className="p-1.5 text-content-secondary hover:text-content-primary hover:bg-subtle rounded transition-colors"
                            aria-label={`Edit ${student.student_id}`}
                            title="Edit student"
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(student)}
                            className="p-1.5 text-content-secondary hover:text-accent-danger hover:bg-subtle rounded transition-colors"
                            aria-label={`Delete ${student.student_id}`}
                            title="Delete student"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination Footer */}
          <CardFooter className="flex items-center justify-between text-xs text-content-secondary">
            <div>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} students
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* 4. Register Student Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Student"
        description="Add a student to the university roster for course registration."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded bg-accent-danger-muted/30 border border-accent-danger/30 text-xs text-accent-danger">
              {formErrors.general}
            </div>
          )}

          <Input
            label="Student Identifier *"
            placeholder="e.g. S1001"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            error={formErrors.student_id}
            autoFocus
          />

          <Input
            label="Full Display Name"
            placeholder="e.g. Ada Lovelace"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Register Student
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 5. Edit Student Dialog */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Student: ${selectedStudent?.student_id}`}
        description="Update student details and institutional identifier."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded bg-accent-danger-muted/30 border border-accent-danger/30 text-xs text-accent-danger">
              {formErrors.general}
            </div>
          )}

          <Input
            label="Student Identifier *"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            error={formErrors.student_id}
          />

          <Input
            label="Full Display Name"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Update Student
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 6. Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Delete Student '${selectedStudent?.student_id}'?`}
        description="Are you sure you want to remove this student from the system?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-accent-danger-muted/20 border border-accent-danger/30 text-xs text-content-secondary leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-accent-danger mb-1">
              <WarningCircle size={16} weight="bold" />
              <span>Cascade Removal</span>
            </div>
            Deleting student <strong>{selectedStudent?.student_id}</strong> ({selectedStudent?.display_name || "No name"})
            will remove all <strong>{selectedStudent?.enrolment_count || 0}</strong> associated course enrolments
            and update the scheduling conflict graph.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-subtle">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={handleDeleteConfirm}
              isLoading={isSubmitting}
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 7. Manage Enrolments Modal */}
      <Dialog
        isOpen={isEnrolmentsOpen}
        onClose={() => setIsEnrolmentsOpen(false)}
        title={`Course Enrolments: ${selectedStudent?.student_id}`}
        description={`Manage examinations taken by ${selectedStudent?.display_name || selectedStudent?.student_id}. Concurrent courses generate conflict edges.`}
      >
        <div className="space-y-5" data-testid="enrolment-modal">
          {/* Error banner */}
          {enrolmentError && (
            <div className="p-3 rounded-lg bg-accent-danger-muted/30 border border-accent-danger/30 text-xs text-accent-danger flex items-start gap-2">
              <WarningCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{enrolmentError}</span>
            </div>
          )}

          {/* Add Enrolment Form */}
          <form onSubmit={handleAddEnrolment} className="p-3.5 rounded-lg bg-subtle border border-border-subtle space-y-3">
            <div className="text-xs font-semibold text-content-primary">Enroll in Course</div>
            <div className="flex items-center gap-2">
              <select
                value={selectedExamToEnroll}
                onChange={(e) => setSelectedExamToEnroll(e.target.value)}
                className="flex-1 h-9 px-3 rounded-md bg-surface border border-border-strong text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent-amber"
                aria-label="Select examination to enroll"
              >
                <option value="">Select an examination course...</option>
                {allExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.code} — {ex.name}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!selectedExamToEnroll || isEnrolling}
                isLoading={isEnrolling}
                leftIcon={<Plus size={13} weight="bold" />}
              >
                Enroll
              </Button>
            </div>
          </form>

          {/* Current Enrolments List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-content-muted flex items-center justify-between">
              <span>Active Registrations</span>
              <span className="font-mono text-content-primary">{studentEnrolments.length} courses</span>
            </div>

            {studentEnrolments.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border-subtle rounded-lg text-xs text-content-muted">
                This student is not currently enrolled in any examinations.
              </div>
            ) : (
              <div className="divide-y divide-border-subtle border border-border-subtle rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                {studentEnrolments.map((enrol) => (
                  <div
                    key={enrol.id}
                    className="p-3 bg-surface hover:bg-subtle/50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-accent-amber mr-2">
                        {enrol.exam_code}
                      </span>
                      <span className="text-content-primary font-medium">
                        {enrol.exam_name}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-accent-danger hover:bg-accent-danger-muted/20"
                      onClick={() => handleDropEnrolment(enrol.id, enrol.exam_code)}
                      leftIcon={<LinkBreak size={12} />}
                    >
                      Drop
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-border-subtle">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsEnrolmentsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
