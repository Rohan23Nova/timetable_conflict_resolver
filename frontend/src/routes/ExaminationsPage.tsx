import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  PencilSimple,
  Trash,
  ArrowClockwise,
  WarningCircle,
} from "@phosphor-icons/react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, SearchInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/services/apiClient";
import { Exam, ExamCreate, ExamUpdate } from "@/types/api";

const PAGE_SIZE = 25;

export const ExaminationsPage: React.FC = () => {
  const { addToast } = useToast();

  const [exams, setExams] = useState<Exam[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    department: string;
    semester: string;
    duration: string;
  }>({
    code: "",
    name: "",
    department: "",
    semester: "",
    duration: "180",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchExams = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.exams.list(
          {
            skip: page * PAGE_SIZE,
            limit: PAGE_SIZE,
            search: search.trim() || undefined,
          },
          signal
        );
        setExams(response.items);
        setTotal(response.total);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        const apiErr = err as { message?: string };
        setError(apiErr?.message || "Failed to load examination catalog.");
      } finally {
        setIsLoading(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchExams(controller.signal);
    return () => controller.abort();
  }, [fetchExams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchExams();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) {
      errors.code = "Examination code is required (e.g. CS101).";
    }
    if (!formData.name.trim()) {
      errors.name = "Subject name or course title is required.";
    }
    if (formData.duration) {
      const dur = parseInt(formData.duration, 10);
      if (isNaN(dur) || dur < 1 || dur > 600) {
        errors.duration = "Duration must be between 1 and 600 minutes.";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateDialog = () => {
    setFormData({
      code: "",
      name: "",
      department: "",
      semester: "Fall 2026",
      duration: "180",
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const openEditDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setFormData({
      code: exam.code,
      name: exam.name,
      department: exam.department || "",
      semester: exam.semester || "",
      duration: exam.duration ? exam.duration.toString() : "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const openDeleteDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: ExamCreate = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        department: formData.department.trim() || undefined,
        semester: formData.semester.trim() || undefined,
        duration: formData.duration ? parseInt(formData.duration, 10) : undefined,
      };
      await apiClient.exams.create(payload);
      addToast({
        title: "Examination Created",
        message: `Course '${payload.code}' has been registered in catalog.`,
        type: "success",
      });
      setIsCreateOpen(false);
      await fetchExams();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      if (apiErr?.status === 409) {
        setFormErrors({ code: apiErr.message || "This course code already exists." });
      } else {
        setFormErrors({ general: apiErr?.message || "Failed to create examination." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: ExamUpdate = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        department: formData.department.trim() || undefined,
        semester: formData.semester.trim() || undefined,
        duration: formData.duration ? parseInt(formData.duration, 10) : undefined,
      };
      await apiClient.exams.update(selectedExam.id, payload);
      addToast({
        title: "Examination Updated",
        message: `Course '${payload.code || selectedExam.code}' updated successfully.`,
        type: "success",
      });
      setIsEditOpen(false);
      await fetchExams();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      if (apiErr?.status === 409) {
        setFormErrors({ code: apiErr.message || "Course code is already used." });
      } else {
        setFormErrors({ general: apiErr?.message || "Failed to update examination." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExam) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.exams.delete(selectedExam.id);
      addToast({
        title: "Examination Removed",
        message: `Course '${res.deleted_code}' removed. ${res.enrolments_removed} enrolments cleaned.`,
        type: "info",
      });
      setIsDeleteOpen(false);
      await fetchExams();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      addToast({
        title: "Deletion Failed",
        message: apiErr?.message || "Could not delete examination.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="examinations-page">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-amber">
              Curriculum Catalog
            </span>
            <span className="text-content-muted">•</span>
            <span className="text-xs text-content-muted font-mono">{total} courses</span>
          </div>
          <h2 className="text-2xl font-bold text-content-primary tracking-tight">
            Examinations Catalog
          </h2>
          <p className="text-xs text-content-secondary mt-1">
            Manage course codes, examination names, departments, and required durations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchExams()}
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
            Add Examination
          </Button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
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
              placeholder="Search by code (e.g. CS101), title, or department..."
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Filter
          </Button>
        </form>
      </Card>

      {/* 3. Table / State Area */}
      {isLoading && exams.length === 0 ? (
        <Card variant="default" className="p-6 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="text" className="h-10 w-full" />
          ))}
        </Card>
      ) : error ? (
        <ErrorState
          title="Could Not Load Examinations"
          message={error}
          onRetry={() => fetchExams()}
        />
      ) : exams.length === 0 ? (
        <Card variant="default">
          <CardContent className="py-12">
            <EmptyState
              icon={<GraduationCap size={32} className="text-accent-amber" />}
              title={search ? "No Examinations Match Query" : "No Examinations Registered"}
              description={
                search
                  ? `No course matches '${search}'. Try adjusting your search query.`
                  : "Get started by adding your first university examination course."
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
                    Add Examination
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
              <table className="w-full text-left text-xs" data-testid="exams-table">
                <thead>
                  <tr className="border-b border-border-subtle bg-subtle/50 text-content-muted font-mono uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Course Code</th>
                    <th className="py-3 px-4 font-semibold">Title</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">Semester</th>
                    <th className="py-3 px-4 font-semibold text-center">Duration</th>
                    <th className="py-3 px-4 font-semibold text-center">Enrolments</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-subtle/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-accent-amber">
                        {exam.code}
                      </td>
                      <td className="py-3 px-4 text-content-primary font-medium">
                        {exam.name}
                      </td>
                      <td className="py-3 px-4 text-content-secondary">
                        {exam.department || "—"}
                      </td>
                      <td className="py-3 px-4 text-content-secondary">
                        {exam.semester || "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-content-secondary">
                        {exam.duration ? `${exam.duration}m` : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={exam.enrolment_count > 0 ? "teal" : "muted"}
                          size="sm"
                        >
                          {exam.enrolment_count} students
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDialog(exam)}
                            className="p-1.5 text-content-secondary hover:text-content-primary hover:bg-subtle rounded transition-colors"
                            aria-label={`Edit ${exam.code}`}
                            title="Edit examination"
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(exam)}
                            className="p-1.5 text-content-secondary hover:text-accent-danger hover:bg-subtle rounded transition-colors"
                            aria-label={`Delete ${exam.code}`}
                            title="Delete examination"
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
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} courses
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

      {/* 4. Create Examination Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Course Examination"
        description="Register a new academic examination for conflict-free timetable scheduling."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded bg-accent-danger-muted/30 border border-accent-danger/30 text-xs text-accent-danger">
              {formErrors.general}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Course Code *"
              placeholder="e.g. CS101"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              autoFocus
            />
            <Input
              label="Subject / Title *"
              placeholder="e.g. Intro to Computer Science"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Department"
              placeholder="e.g. Computer Science"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label="Semester"
              placeholder="e.g. Fall 2026"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
            />
            <Input
              label="Duration (Minutes)"
              type="number"
              placeholder="180"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              error={formErrors.duration}
            />
          </div>

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
              Save Examination
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 5. Edit Examination Dialog */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Examination: ${selectedExam?.code}`}
        description="Update course details or duration constraints."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded bg-accent-danger-muted/30 border border-accent-danger/30 text-xs text-accent-danger">
              {formErrors.general}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Course Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
            />
            <Input
              label="Subject / Title *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label="Semester"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
            />
            <Input
              label="Duration (Minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              error={formErrors.duration}
            />
          </div>

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
              Update Examination
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 6. Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Delete Examination '${selectedExam?.code}'?`}
        description="Are you sure you want to delete this course from the scheduling studio?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-accent-danger-muted/20 border border-accent-danger/30 text-xs text-content-secondary leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-accent-danger mb-1">
              <WarningCircle size={16} weight="bold" />
              <span>Cascading Deletion Policy</span>
            </div>
            Deleting <strong>{selectedExam?.code}</strong> ({selectedExam?.name}) will permanently remove
            all <strong>{selectedExam?.enrolment_count || 0}</strong> associated student course enrolments and
            recalculate the conflict graph.
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
    </div>
  );
};
