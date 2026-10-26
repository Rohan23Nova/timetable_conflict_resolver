import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarBlank,
  CheckCircle,
  FileCsv,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { apiClient } from "@/services/apiClient";
import { ScheduleSummaryResponse } from "@/types/api";

export const TimetableHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Rename modal state
  const [editingSchedule, setEditingSchedule] = useState<ScheduleSummaryResponse | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Delete modal state
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleSummaryResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.schedules.list();
      setSchedules(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load timetable schedules history.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenEdit = (schedule: ScheduleSummaryResponse) => {
    setEditingSchedule(schedule);
    setEditName(schedule.name);
    setEditDesc(schedule.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule || !editName.trim()) return;
    setIsUpdating(true);
    try {
      await apiClient.schedules.update(editingSchedule.id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      setIsUpdating(false);
      setEditingSchedule(null);
      fetchSchedules();
    } catch (err: any) {
      setIsUpdating(false);
      alert(err.message || "Failed to update schedule");
    }
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    setIsDeleting(true);
    try {
      await apiClient.schedules.delete(deletingSchedule.id);
      setIsDeleting(false);
      setDeletingSchedule(null);
      fetchSchedules();
    } catch (err: any) {
      setIsDeleting(false);
      alert(err.message || "Failed to delete schedule");
    }
  };

  const handleExportCsv = (scheduleId: string) => {
    const url = apiClient.schedules.getExportCsvUrl(scheduleId);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable_${scheduleId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-content-primary tracking-tight">
              Saved Timetable Schedules
            </h1>
            <Badge variant="outline" size="sm">
              {schedules.length} {schedules.length === 1 ? "Version" : "Versions"}
            </Badge>
          </div>
          <p className="text-xs text-content-secondary">
            Manage, compare, rename, export, or audit all previously generated and verified examination timetables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSchedules}
            leftIcon={<ArrowsClockwise size={14} />}
            className="text-xs"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/app/algorithm-lab")}
            leftIcon={<Plus size={15} />}
            className="text-xs"
          >
            Generate New Schedule
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-content-secondary">
          <ArrowsClockwise size={28} className="animate-spin text-primary" />
          <p className="text-sm">Loading schedule history...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
          {error}
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border-subtle rounded-xl space-y-3">
          <CalendarBlank size={36} className="mx-auto text-content-muted" />
          <h3 className="text-sm font-semibold text-content-primary">No Timetable Schedules Saved</h3>
          <p className="text-xs text-content-secondary max-w-sm mx-auto">
            You have not saved any verified timetables yet. Run graph coloring in the Algorithm Lab and click "Save Schedule" to store your official timetable here.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/app/algorithm-lab")}
            leftIcon={<Plus size={15} />}
          >
            Open Algorithm Laboratory
          </Button>
        </div>
      ) : (
        <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-subtle text-content-secondary font-semibold">
                  <th className="py-3 px-4">Schedule Title</th>
                  <th className="py-3 px-4">Algorithm</th>
                  <th className="py-3 px-4 text-center">Slots Used</th>
                  <th className="py-3 px-4 text-center">Exams Scheduled</th>
                  <th className="py-3 px-4">Status & Integrity</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className="hover:bg-subtle/40 transition-colors text-content-primary group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-content-primary hover:text-primary transition-colors cursor-pointer"
                           onClick={() => navigate(`/app/timetable/${schedule.id}`)}>
                        {schedule.name}
                      </div>
                      {schedule.description && (
                        <div className="text-[11px] text-content-muted line-clamp-1 mt-0.5">
                          {schedule.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-content-secondary">
                      {schedule.algorithm}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" size="sm" className="font-bold text-primary">
                        {schedule.slots_used} Slots
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center text-content-secondary font-medium">
                      {schedule.exam_count} courses
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="outline"
                          size="sm"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        >
                          <CheckCircle size={11} weight="fill" className="mr-1 inline" />
                          Zero Conflicts
                        </Badge>
                        {schedule.is_stale && (
                          <Badge
                            variant="outline"
                            size="sm"
                            className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]"
                          >
                            <WarningCircle size={10} className="mr-1 inline" />
                            Data Changed (Stale)
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-content-muted">
                      {new Date(schedule.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/timetable/${schedule.id}`)}
                          className="text-xs h-7 px-2"
                        >
                          View
                        </Button>
                        <button
                          onClick={() => handleExportCsv(schedule.id)}
                          title="Export CSV"
                          className="p-1.5 text-content-muted hover:text-content-primary rounded hover:bg-subtle transition-colors"
                        >
                          <FileCsv size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(schedule)}
                          title="Rename / Edit"
                          className="p-1.5 text-content-muted hover:text-content-primary rounded hover:bg-subtle transition-colors"
                        >
                          <PencilSimple size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingSchedule(schedule)}
                          title="Delete Schedule"
                          className="p-1.5 text-content-muted hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
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
        </div>
      )}

      {/* Edit Title/Description Dialog */}
      <Dialog
        isOpen={editingSchedule !== null}
        onClose={() => setEditingSchedule(null)}
        title="Rename Timetable Schedule"
        description="Update the display name or administrative notes for this examination timetable."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-content-primary mb-1">
              Timetable Title
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-content-primary mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="ghost" size="sm" onClick={() => setEditingSchedule(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              isLoading={isUpdating}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deletingSchedule !== null}
        onClose={() => setDeletingSchedule(null)}
        title="Delete Saved Timetable?"
        description={`Are you sure you want to delete "${deletingSchedule?.name}"?`}
        variant="destructive"
        confirmText="Delete Timetable"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      >
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 space-y-1">
          <p className="font-semibold text-red-200">
            This action only removes the saved schedule snapshot.
          </p>
          <p>
            Underlying examinations, student records, and enrolments will remain completely intact in the database.
          </p>
        </div>
      </Dialog>
    </div>
  );
};
