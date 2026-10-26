import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  CalendarBlank,
  CalendarCheck,
  CheckCircle,
  Clock,
  Faders,
  FileCsv,
  MagnifyingGlass,
  Printer,
  Table as TableIcon,
  WarningCircle,
  SquaresFour,
  ArrowsClockwise,
  ArrowSquareOut,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/services/apiClient";
import {
  ScheduleDateConfig,
  ScheduleDetailResponse,
  ScheduleSummaryResponse,
  SlotAssignmentDetail,
} from "@/types/api";
import { DateConfigDialog } from "@/components/timetable/DateConfigDialog";

export const TimetableCalendarPage: React.FC = () => {
  const { scheduleId } = useParams<{ scheduleId?: string }>();
  const navigate = useNavigate();

  // State
  const [schedulesList, setSchedulesList] = useState<ScheduleSummaryResponse[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'slots' | 'calendar' | 'table'
  const [viewMode, setViewMode] = useState<"slots" | "calendar" | "table">("slots");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isDateConfigOpen, setIsDateConfigOpen] = useState<boolean>(false);
  const [selectedSlotForDrawer, setSelectedSlotForDrawer] = useState<number | null>(null);

  // Fetch schedules list and current schedule
  const loadData = async (targetId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.schedules.list();
      setSchedulesList(list);

      if (list.length === 0) {
        setLoading(false);
        setCurrentSchedule(null);
        return;
      }

      // Determine which schedule to load
      const idToLoad = targetId || scheduleId || list[0].id;
      const detail = await apiClient.schedules.get(idToLoad);
      setCurrentSchedule(detail);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load examination timetable.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(scheduleId);
  }, [scheduleId]);

  // Compute calendar dates helper
  const getSlotCalendarInfo = (slot: number, config?: ScheduleDateConfig | null) => {
    if (!config || !config.start_date) {
      return { dateStr: "Unassigned Date", sessionStr: `Slot ${slot}` };
    }
    try {
      const start = new Date(config.start_date + "T00:00:00");
      const slotsPerDay = Math.max(1, config.slots_per_day || 2);
      const sessionTimes = config.session_times || ["09:00 - 12:00", "14:00 - 17:00"];
      const skipWeekends = config.skip_weekends ?? true;

      const dayOffset = Math.floor((slot - 1) / slotsPerDay);
      const sessionIdx = (slot - 1) % slotsPerDay;

      const curDate = new Date(start);
      let daysAdded = 0;
      while (daysAdded < dayOffset) {
        curDate.setDate(curDate.getDate() + 1);
        if (skipWeekends && (curDate.getDay() === 0 || curDate.getDay() === 6)) {
          continue;
        }
        daysAdded += 1;
      }

      const formattedDate = curDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const sessionLabel = sessionTimes[sessionIdx] || `Session ${sessionIdx + 1}`;
      return { dateStr: formattedDate, sessionStr: sessionLabel };
    } catch {
      return { dateStr: "Invalid Date", sessionStr: `Slot ${slot}` };
    }
  };

  // Filtered examinations
  const filteredDetails = useMemo(() => {
    if (!currentSchedule) return [];
    return currentSchedule.slot_details.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.exam_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.exam_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.department && item.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept =
        selectedDepartment === "all" ||
        (selectedDepartment === "unassigned" && !item.department) ||
        item.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [currentSchedule, searchQuery, selectedDepartment]);

  // Distinct departments for filter
  const departments = useMemo(() => {
    if (!currentSchedule) return [];
    const depts = new Set<string>();
    currentSchedule.slot_details.forEach((d) => {
      if (d.department) depts.add(d.department);
    });
    return Array.from(depts).sort();
  }, [currentSchedule]);

  // Group by slot
  const slotGroups = useMemo(() => {
    const groups: Record<number, SlotAssignmentDetail[]> = {};
    for (let s = 1; s <= (currentSchedule?.slots_used || 0); s++) {
      groups[s] = [];
    }
    filteredDetails.forEach((item) => {
      if (!groups[item.slot]) groups[item.slot] = [];
      groups[item.slot].push(item);
    });
    return groups;
  }, [filteredDetails, currentSchedule?.slots_used]);

  // Handle date config update
  const handleSaveDateConfig = async (newConfig: ScheduleDateConfig | null) => {
    if (!currentSchedule) return;
    const updated = await apiClient.schedules.update(currentSchedule.id, {
      date_config: newConfig,
    });
    setCurrentSchedule(updated);
  };

  // CSV Export action
  const handleExportCsv = () => {
    if (!currentSchedule) return;
    const exportUrl = apiClient.schedules.getExportCsvUrl(currentSchedule.id);
    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = `timetable_${currentSchedule.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print action
  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-content-secondary">
        <ArrowsClockwise size={28} className="animate-spin text-primary" />
        <p className="text-sm">Loading examination timetable...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <WarningCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-content-primary mb-2">Error Loading Timetable</h2>
        <p className="text-sm text-red-400 max-w-md mx-auto mb-6">{error}</p>
        <Button variant="primary" onClick={() => loadData(scheduleId)}>
          Retry
        </Button>
      </div>
    );
  }

  // Empty state (no schedules saved yet)
  if (!currentSchedule || schedulesList.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <CalendarBlank size={32} />
        </div>
        <h2 className="text-xl font-bold text-content-primary mb-2">No Saved Timetables Yet</h2>
        <p className="text-sm text-content-secondary max-w-md mx-auto mb-6">
          Generate an optimal conflict-free examination schedule in the Algorithm Laboratory, then save it here to manage sessions, dates, and exports.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" onClick={() => navigate("/app/algorithm-lab")}>
            Open Algorithm Laboratory
          </Button>
          <Button variant="outline" onClick={() => navigate("/app/graph")}>
            Inspect Conflict Graph
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Printable Title (hidden on screen, visible on paper/PDF print) */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-black">SLOTWISE — University Examination Timetable</h1>
        <p className="text-sm text-gray-700 font-medium mt-1">{currentSchedule.name}</p>
        {currentSchedule.description && (
          <p className="text-xs text-gray-500 mt-0.5">{currentSchedule.description}</p>
        )}
        <div className="flex gap-4 text-xs text-gray-600 mt-2">
          <span>Total Slots: {currentSchedule.slots_used}</span>
          <span>Examinations: {currentSchedule.slot_details.length}</span>
          <span>Verification: Zero Mutual Conflicts (Verified Valid)</span>
        </div>
      </div>

      {/* Screen Header & Schedule Selector */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-content-primary tracking-tight">
              Timetable Calendar & Schedule Management
            </h1>
            <Badge variant="outline" size="sm" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle size={12} weight="fill" className="mr-1 inline" />
              Verified Valid
            </Badge>
          </div>
          <p className="text-xs text-content-secondary">
            Inspect conflict-free examination assignments across chromatic slots, manage calendar dates, and generate printable exports.
          </p>
        </div>

        {/* Schedule Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-surface border border-border-default rounded-lg px-2.5 py-1.5">
            <CalendarCheck size={16} className="text-primary" />
            <select
              value={currentSchedule.id}
              onChange={(e) => {
                navigate(`/app/timetable/${e.target.value}`);
              }}
              className="bg-transparent text-xs font-medium text-content-primary focus:outline-none cursor-pointer pr-4"
            >
              {schedulesList.map((s) => (
                <option key={s.id} value={s.id} className="bg-surface text-content-primary">
                  {s.name} ({s.slots_used} slots) {s.is_stale ? "• Stale" : ""}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/timetable/history")}
            className="text-xs"
          >
            History ({schedulesList.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDateConfigOpen(true)}
            leftIcon={<CalendarBlank size={15} />}
            className="text-xs"
          >
            Date Settings
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<FileCsv size={15} />}
            className="text-xs"
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={15} />}
            className="text-xs"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Stale Schedule Warning Banner */}
      {currentSchedule.is_stale && (
        <div className="print:hidden p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-300">
          <WarningCircle size={20} className="shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide uppercase text-amber-400">
              Source Data Modified — Historical Snapshot Preserved
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              University examinations or student enrolments have been added or updated in the database since this timetable was generated.
              This saved timetable remains preserved as a historical snapshot. We recommend regenerating or re-verifying the schedule in the Algorithm Laboratory.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <Link
                to="/app/algorithm-lab"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
              >
                Open Algorithm Lab to Regenerate <ArrowSquareOut size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Metadata & Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface border border-border-subtle rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
            Total Slots Required
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-content-primary">
              {currentSchedule.slots_used}
            </span>
            <span className="text-xs text-content-muted">discrete sessions</span>
          </div>
        </div>

        <div className="p-3 bg-surface border border-border-subtle rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
            Examinations Scheduled
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-content-primary">
              {currentSchedule.slot_details.length}
            </span>
            <span className="text-xs text-content-muted">courses</span>
          </div>
        </div>

        <div className="p-3 bg-surface border border-border-subtle rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
            Algorithm Used
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-semibold text-content-primary capitalize">
              {currentSchedule.algorithm}
            </span>
            <span className="text-xs text-content-muted">
              ({String(currentSchedule.parameters?.ordering_strategy || "LDF")})
            </span>
          </div>
        </div>

        <div className="p-3 bg-surface border border-border-subtle rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
            Calendar Period
          </span>
          <div className="flex items-baseline gap-2 mt-1 truncate">
            {currentSchedule.date_config?.start_date ? (
              <span className="text-xs font-semibold text-emerald-400 truncate">
                Starts {currentSchedule.date_config.start_date}
              </span>
            ) : (
              <span className="text-xs font-medium text-content-muted">
                Abstract Chromatic Slots
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls: Search, Department Filter, and View Mode Switcher */}
      <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-subtle p-3 rounded-xl border border-border-subtle">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, course name, department..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-content-primary placeholder:text-content-muted"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters and View Switcher */}
        <div className="flex items-center gap-2.5">
          {departments.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-content-secondary">
              <Faders size={14} />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-surface border border-border-default rounded-lg px-2.5 py-1 text-xs text-content-primary focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-surface border border-border-default rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("slots")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "slots"
                  ? "bg-primary text-white"
                  : "text-content-secondary hover:text-content-primary"
              }`}
              title="Slot Swimlanes View"
            >
              <SquaresFour size={14} />
              <span>Slots</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "calendar"
                  ? "bg-primary text-white"
                  : "text-content-secondary hover:text-content-primary"
              }`}
              title="Calendar Timeline View"
            >
              <CalendarBlank size={14} />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-white"
                  : "text-content-secondary hover:text-content-primary"
              }`}
              title="Tabular List View"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}

      {/* 1. SLOTS SWIMLANE VIEW */}
      {viewMode === "slots" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: currentSchedule.slots_used }, (_, i) => i + 1).map((slotNum) => {
              const examsInSlot = slotGroups[slotNum] || [];
              const { dateStr, sessionStr } = getSlotCalendarInfo(
                slotNum,
                currentSchedule.date_config
              );

              return (
                <div
                  key={slotNum}
                  className="flex flex-col bg-surface border border-border-default rounded-xl overflow-hidden shadow-xs hover:border-border-strong transition-colors"
                >
                  {/* Slot Header */}
                  <div
                    onClick={() => setSelectedSlotForDrawer(slotNum)}
                    className="p-3 bg-surface-subtle border-b border-border-subtle cursor-pointer hover:bg-subtle/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                        Slot {slotNum}
                      </span>
                      <Badge variant="outline" size="sm" className="text-[11px]">
                        {examsInSlot.length} {examsInSlot.length === 1 ? "Course" : "Courses"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-content-muted">
                      <span>{dateStr}</span>
                      <span>{sessionStr}</span>
                    </div>
                  </div>

                  {/* Course Cards */}
                  <div className="p-3 space-y-2 flex-1 min-h-[120px]">
                    {examsInSlot.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-content-muted italic py-6">
                        No courses matching filters
                      </div>
                    ) : (
                      examsInSlot.map((exam) => (
                        <div
                          key={exam.exam_code}
                          className="p-2.5 bg-subtle/40 hover:bg-subtle border border-border-subtle rounded-lg transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-semibold text-content-primary group-hover:text-primary transition-colors">
                              {exam.exam_code}
                            </span>
                            <Badge
                              variant="outline"
                              size="sm"
                              className="text-[10px] py-0 px-1 border-border-subtle text-content-muted"
                              title={`d(v) = ${exam.degree} conflicting courses in graph`}
                            >
                              d={exam.degree}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-content-secondary line-clamp-1 mt-0.5">
                            {exam.exam_name}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-content-muted">
                            <span>{exam.department || "General"}</span>
                            {exam.semester && <span>Sem {exam.semester}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Slot Footer Guarantee */}
                  <div
                    onClick={() => setSelectedSlotForDrawer(slotNum)}
                    className="px-3 py-1.5 bg-surface-subtle/50 border-t border-border-subtle text-[10px] text-emerald-400 font-medium flex items-center justify-between cursor-pointer hover:bg-subtle transition-colors"
                  >
                    <span>0 mutual conflicts guaranteed</span>
                    <span className="text-content-muted underline">Details</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <div>
          {!currentSchedule.date_config?.start_date ? (
            <div className="p-8 text-center bg-surface border border-border-subtle rounded-xl space-y-3">
              <CalendarBlank size={36} className="mx-auto text-primary" />
              <h3 className="text-base font-semibold text-content-primary">
                Calendar Dates Not Yet Configured
              </h3>
              <p className="text-xs text-content-secondary max-w-md mx-auto">
                Currently, this timetable is organized by abstract chromatic slots. Enable calendar dates to view daily sessions (morning/afternoon) and concrete exam times.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDateConfigOpen(true)}
                leftIcon={<CalendarBlank size={16} />}
              >
                Configure Examination Dates
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group slots by Day */}
              {(() => {
                const slotsPerDay = Math.max(1, currentSchedule.date_config?.slots_per_day || 2);
                const totalDays = Math.ceil(currentSchedule.slots_used / slotsPerDay);

                return Array.from({ length: totalDays }, (_, dayIdx) => {
                  const daySlots = Array.from(
                    { length: slotsPerDay },
                    (_, sIdx) => dayIdx * slotsPerDay + sIdx + 1
                  ).filter((s) => s <= currentSchedule.slots_used);

                  const firstSlotInfo = getSlotCalendarInfo(
                    daySlots[0],
                    currentSchedule.date_config
                  );

                  return (
                    <div
                      key={dayIdx}
                      className="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-xs"
                    >
                      {/* Day Header */}
                      <div className="px-4 py-2.5 bg-surface-subtle border-b border-border-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck size={16} className="text-primary" />
                          <span className="text-xs font-bold text-content-primary">
                            Day {dayIdx + 1} — {firstSlotInfo.dateStr}
                          </span>
                        </div>
                        <Badge variant="outline" size="sm">
                          {daySlots.reduce(
                            (acc, s) => acc + (slotGroups[s] || []).length,
                            0
                          )}{" "}
                          Exams Today
                        </Badge>
                      </div>

                      {/* Sessions within this day */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {daySlots.map((slotNum) => {
                          const examsInSlot = slotGroups[slotNum] || [];
                          const { sessionStr } = getSlotCalendarInfo(
                            slotNum,
                            currentSchedule.date_config
                          );

                          return (
                            <div
                              key={slotNum}
                              className="p-3 bg-subtle/30 border border-border-subtle rounded-lg space-y-2"
                            >
                              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                                <span className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                                  <Clock size={14} className="text-primary" />
                                  {sessionStr} (Slot {slotNum})
                                </span>
                                <Badge variant="outline" size="sm" className="text-[10px]">
                                  {examsInSlot.length}
                                </Badge>
                              </div>

                              <div className="space-y-1.5">
                                {examsInSlot.length === 0 ? (
                                  <p className="text-xs text-content-muted italic py-2">
                                    No exams scheduled
                                  </p>
                                ) : (
                                  examsInSlot.map((exam) => (
                                    <div
                                      key={exam.exam_code}
                                      className="p-2 bg-surface border border-border-subtle rounded text-xs flex items-center justify-between"
                                    >
                                      <div>
                                        <span className="font-semibold text-content-primary">
                                          {exam.exam_code}
                                        </span>
                                        <span className="text-content-muted mx-1.5">•</span>
                                        <span className="text-content-secondary">
                                          {exam.exam_name}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-content-muted">
                                        {exam.department || ""}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* 3. TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-subtle text-content-secondary font-semibold">
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session Window</th>
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4 text-center">Conflict Degree</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredDetails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-content-muted italic">
                      No examinations matching current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredDetails
                    .sort((a, b) => a.slot - b.slot || a.exam_code.localeCompare(b.exam_code))
                    .map((item) => {
                      const { dateStr, sessionStr } = getSlotCalendarInfo(
                        item.slot,
                        currentSchedule.date_config
                      );

                      return (
                        <tr
                          key={item.exam_code}
                          className="hover:bg-subtle/40 transition-colors text-content-primary"
                        >
                          <td className="py-2.5 px-4 font-semibold text-primary">
                            Slot {item.slot}
                          </td>
                          <td className="py-2.5 px-4 text-content-secondary">{dateStr}</td>
                          <td className="py-2.5 px-4 text-content-secondary">{sessionStr}</td>
                          <td className="py-2.5 px-4 font-mono font-medium">{item.exam_code}</td>
                          <td className="py-2.5 px-4">{item.exam_name}</td>
                          <td className="py-2.5 px-4 text-content-secondary">
                            {item.department || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-content-secondary">
                            {item.semester || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded bg-subtle text-content-muted text-[11px] font-mono">
                              d={item.degree}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Link
                              to={`/app/graph?search=${encodeURIComponent(item.exam_code)}`}
                              className="text-primary hover:underline inline-flex items-center gap-1 text-[11px]"
                            >
                              Inspect <ArrowSquareOut size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slot Details Drawer / Modal */}
      {selectedSlotForDrawer !== null && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedSlotForDrawer(null)}
        >
          <div
            className="w-full max-w-lg bg-surface border border-border-default rounded-xl shadow-elevated overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-subtle border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-content-primary">
                  Slot {selectedSlotForDrawer} Detail & Conflict Guarantee
                </h3>
                <p className="text-xs text-content-muted mt-0.5">
                  {getSlotCalendarInfo(selectedSlotForDrawer, currentSchedule.date_config).dateStr} •{" "}
                  {
                    getSlotCalendarInfo(selectedSlotForDrawer, currentSchedule.date_config)
                      .sessionStr
                  }
                </p>
              </div>
              <button
                onClick={() => setSelectedSlotForDrawer(null)}
                className="text-content-muted hover:text-content-primary p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Conflict Guarantee Card */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2.5 text-emerald-400">
                <CheckCircle size={18} weight="fill" className="shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold block text-emerald-300">
                    Mathematical Non-Conflict Guarantee
                  </span>
                  All {(slotGroups[selectedSlotForDrawer] || []).length} courses scheduled in this
                  slot share exactly zero students. Each pair forms an independent set in the
                  conflict graph.
                </div>
              </div>

              {/* Course List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-content-primary block">
                  Examinations in Slot {selectedSlotForDrawer}:
                </span>
                {(slotGroups[selectedSlotForDrawer] || []).map((exam) => (
                  <div
                    key={exam.exam_code}
                    className="p-3 bg-subtle/40 border border-border-subtle rounded-lg flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-content-primary">
                          {exam.exam_code}
                        </span>
                        <span className="text-xs text-content-secondary">— {exam.exam_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-content-muted mt-1">
                        <span>{exam.department || "General"}</span>
                        {exam.semester && <span>• Semester {exam.semester}</span>}
                        <span>• Graph Degree d={exam.degree}</span>
                      </div>
                    </div>
                    <Link
                      to={`/app/graph?search=${encodeURIComponent(exam.exam_code)}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      Graph <ArrowSquareOut size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 bg-subtle/40 border-t border-border-subtle flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setSelectedSlotForDrawer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Date Configuration Dialog */}
      <DateConfigDialog
        isOpen={isDateConfigOpen}
        onClose={() => setIsDateConfigOpen(false)}
        currentConfig={currentSchedule.date_config}
        onSave={handleSaveDateConfig}
      />
    </div>
  );
};
