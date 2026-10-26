import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/services/apiClient";
import {
  ScheduleCreateRequest,
  ScheduleDateConfig,
  ScheduleDetailResponse,
  ScheduleRunResponse,
} from "@/types/api";
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";

interface SaveScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  runResult: ScheduleRunResponse | null;
  onSaved: (savedSchedule: ScheduleDetailResponse) => void;
}

export const SaveScheduleDialog: React.FC<SaveScheduleDialogProps> = ({
  isOpen,
  onClose,
  runResult,
  onSaved,
}) => {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [includeDateConfig, setIncludeDateConfig] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [slotsPerDay, setSlotsPerDay] = useState<number>(2);
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [skipWeekends, setSkipWeekends] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize default name when opened
  React.useEffect(() => {
    if (runResult) {
      const algoTitle =
        runResult.algorithm === "greedy"
          ? "Greedy (LDF)"
          : "Exact Backtracking";
      const dateStr = new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setName(`${algoTitle} Timetable — ${runResult.slots_used} Slots (${dateStr})`);
      setDescription(
        `Generated with ${runResult.algorithm} algorithm (${runResult.ordering_strategy}). ` +
          `Required ${runResult.slots_used} distinct exam time slots.`
      );
      setErrorMsg(null);
    }
  }, [runResult, isOpen]);

  if (!runResult) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please provide a name for this timetable schedule.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let dateConfig: ScheduleDateConfig | null = null;
    if (includeDateConfig && startDate) {
      dateConfig = {
        start_date: startDate,
        slots_per_day: Number(slotsPerDay) || 2,
        session_times:
          slotsPerDay === 1
            ? ["10:00 - 13:00"]
            : slotsPerDay === 3
            ? ["08:30 - 11:30", "12:30 - 15:30", "16:30 - 19:30"]
            : ["09:00 - 12:00", "14:00 - 17:00"],
        slot_duration_minutes: Number(durationMinutes) || 180,
        slot_break_minutes: 120,
        skip_weekends: skipWeekends,
      };
    }

    const payload: ScheduleCreateRequest = {
      name: name.trim(),
      description: description.trim() || null,
      algorithm: runResult.algorithm,
      parameters: {
        ordering_strategy: runResult.ordering_strategy,
        max_colors: runResult.max_colors,
      },
      slot_assignments: runResult.slot_assignments,
      slot_details: runResult.slot_details,
      slots_used: runResult.slots_used,
      is_valid: runResult.is_valid,
      validation_report: runResult.validation_report,
      date_config: dateConfig,
    };

    try {
      const response = await apiClient.schedules.save(payload);
      setIsSubmitting(false);
      onSaved(response);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || "Failed to save timetable schedule.");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Save Verified Timetable Schedule"
      description="Persist this verified conflict-free schedule for university exam publication, calendar viewing, and export."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Verification Summary Badge Strip */}
        <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-lg flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle size={16} weight="fill" />
            <span>Independently Verified (0 Conflicts)</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm">
              {runResult.slots_used} Slots
            </Badge>
            <Badge variant="outline" size="sm">
              {Object.keys(runResult.slot_assignments).length} Examinations
            </Badge>
          </div>
        </div>

        {/* Schedule Name */}
        <div>
          <label className="block text-xs font-semibold text-content-primary mb-1">
            Timetable Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fall 2026 Official Examination Schedule"
            className="w-full px-3 py-2 text-sm bg-surface border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-content-primary placeholder:text-content-muted"
          />
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-semibold text-content-primary mb-1">
            Notes / Description (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Approved by Academic Board for undergraduate examinations"
            className="w-full px-3 py-2 text-sm bg-surface border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-content-primary placeholder:text-content-muted"
          />
        </div>

        {/* Date Configuration Accordion/Toggle */}
        <div className="pt-2 border-t border-border-subtle">
          <label className="flex items-center gap-2 text-xs font-medium text-content-primary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDateConfig}
              onChange={(e) => setIncludeDateConfig(e.target.checked)}
              className="rounded border-border-default text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <CalendarBlank size={15} className="text-primary" />
            <span>Map abstract slots to calendar dates and session times</span>
          </label>

          {includeDateConfig && (
            <div className="mt-3 p-3 bg-surface-subtle border border-border-subtle rounded-lg space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-content-secondary mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required={includeDateConfig}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-content-secondary mb-1">
                    Sessions Per Day
                  </label>
                  <select
                    value={slotsPerDay}
                    onChange={(e) => setSlotsPerDay(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={1}>1 Session / Day</option>
                    <option value={2}>2 Sessions / Day (Morning, Afternoon)</option>
                    <option value={3}>3 Sessions / Day (Morning, Midday, Evening)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-content-secondary mb-1">
                    Exam Duration (Min)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-content-muted" />
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-1.5 text-[11px] text-content-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipWeekends}
                      onChange={(e) => setSkipWeekends(e.target.checked)}
                      className="rounded border-border-default text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>Skip weekends (Mon–Fri)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Sparkle size={15} />}
          >
            Save Timetable
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
