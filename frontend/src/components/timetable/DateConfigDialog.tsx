import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ScheduleDateConfig } from "@/types/api";
import { CalendarBlank, Clock, Trash } from "@phosphor-icons/react";

interface DateConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: ScheduleDateConfig | null;
  onSave: (config: ScheduleDateConfig | null) => Promise<void>;
}

export const DateConfigDialog: React.FC<DateConfigDialogProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [slotsPerDay, setSlotsPerDay] = useState<number>(2);
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [skipWeekends, setSkipWeekends] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentConfig && currentConfig.start_date) {
        setEnabled(true);
        setStartDate(currentConfig.start_date || "");
        setSlotsPerDay(currentConfig.slots_per_day || 2);
        setDurationMinutes(currentConfig.slot_duration_minutes || 180);
        setSkipWeekends(currentConfig.skip_weekends ?? true);
      } else {
        setEnabled(false);
        // Default to a sensible next Monday
        const d = new Date();
        d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
        setStartDate(d.toISOString().slice(0, 10));
        setSlotsPerDay(2);
        setDurationMinutes(180);
        setSkipWeekends(true);
      }
      setErrorMsg(null);
    }
  }, [isOpen, currentConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!enabled) {
        await onSave(null);
      } else {
        if (!startDate) {
          setErrorMsg("Please select an examination start date.");
          setIsSubmitting(false);
          return;
        }

        const sessionTimes =
          slotsPerDay === 1
            ? ["10:00 - 13:00"]
            : slotsPerDay === 3
            ? ["08:30 - 11:30", "12:30 - 15:30", "16:30 - 19:30"]
            : ["09:00 - 12:00", "14:00 - 17:00"];

        const updatedConfig: ScheduleDateConfig = {
          start_date: startDate,
          slots_per_day: Number(slotsPerDay) || 2,
          session_times: sessionTimes,
          slot_duration_minutes: Number(durationMinutes) || 180,
          slot_break_minutes: 120,
          skip_weekends: skipWeekends,
        };

        await onSave(updatedConfig);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || "Failed to update calendar configuration.");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Calendar Configuration"
      description="Map abstract chromatic slots (Slot 1, Slot 2) to concrete calendar examination dates and session windows."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg">
          <label className="flex items-center gap-2 text-xs font-semibold text-content-primary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-border-default text-primary focus:ring-primary h-4 w-4"
            />
            <CalendarBlank size={16} className="text-primary" />
            <span>Enable Real Calendar Dates & Session Windows</span>
          </label>
          <p className="mt-1 text-[11px] text-content-muted pl-6">
            When disabled, the timetable displays abstract mathematical slots only, maintaining strict separation between graph coloring and dates.
          </p>
        </div>

        {enabled && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Examination Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required={enabled}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Sessions Per Day
                </label>
                <select
                  value={slotsPerDay}
                  onChange={(e) => setSlotsPerDay(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={1}>1 Session / Day (Morning)</option>
                  <option value={2}>2 Sessions / Day (Morning & Afternoon)</option>
                  <option value={3}>3 Sessions / Day (Morning, Midday, Evening)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Default Duration (Minutes)
                </label>
                <div className="flex items-center gap-1.5">
                  <Clock size={15} className="text-content-muted" />
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-surface border border-border-default rounded-md text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipWeekends}
                    onChange={(e) => setSkipWeekends(e.target.checked)}
                    className="rounded border-border-default text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Skip Saturday & Sunday</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          {enabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEnabled(false)}
              className="text-xs text-content-muted hover:text-red-400 gap-1.5"
            >
              <Trash size={14} />
              Revert to Abstract Slots
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Apply Settings
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};
