import React, { useState } from "react";
import type { GraphVertex } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  X,
  CheckCircle,
  Warning,
  CaretDown,
  CaretRight,
  ArrowsOutCardinal,
  CalendarCheck,
} from "@phosphor-icons/react";

export interface ConflictingExamDetail {
  neighbor: GraphVertex;
  weight: number;
  sharedStudents: string[];
}

export interface GraphDetailsPanelProps {
  selectedVertex: GraphVertex | null;
  conflictingExams: ConflictingExamDetail[];
  onClose: () => void;
  onSelectNeighbor: (code: string) => void;
}

export const GraphDetailsPanel: React.FC<GraphDetailsPanelProps> = ({
  selectedVertex,
  conflictingExams,
  onClose,
  onSelectNeighbor,
}) => {
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  if (!selectedVertex) return null;

  const isIsolated = selectedVertex.degree === 0;

  const toggleExpand = (neighborCode: string) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [neighborCode]: !prev[neighborCode],
    }));
  };

  return (
    <div
      className="w-full lg:w-96 bg-surface border border-border-strong rounded-xl shadow-elevated flex flex-col max-h-[750px] overflow-hidden transition-all duration-200"
      data-testid="graph-details-panel"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-border-subtle bg-surface-elevated/40 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-accent-amber">
              {selectedVertex.code}
            </span>
            <Badge
              variant={isIsolated ? "teal" : selectedVertex.degree >= 3 ? "amber" : "default"}
              size="sm"
            >
              {isIsolated ? "Isolated (d=0)" : `d(v) = ${selectedVertex.degree}`}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-content-primary mt-1 line-clamp-2">
            {selectedVertex.name}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close details panel"
          className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-subtle transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Meta Specs */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-subtle/30 border-b border-border-subtle text-xs">
        <div>
          <span className="text-[10px] uppercase font-mono text-content-muted block">
            Department
          </span>
          <span className="font-medium text-content-primary truncate block">
            {selectedVertex.department || "General / Unassigned"}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-content-muted block">
            Semester
          </span>
          <span className="font-medium text-content-primary truncate block">
            {selectedVertex.semester || "Standard Term"}
          </span>
        </div>
      </div>

      {/* Scheduling Context Alert */}
      <div className="px-4 py-3 bg-surface border-b border-border-subtle text-xs leading-relaxed">
        {isIsolated ? (
          <div className="flex items-start gap-2 text-status-success">
            <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <p className="text-[11px] text-content-secondary">
              <strong className="text-status-success font-semibold">Conflict-Free Course:</strong>{" "}
              No enrolled students share other examinations. This course has no color-clash constraints
              and can be allocated to any available examination slot.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-accent-amber">
            <Warning size={16} weight="bold" className="shrink-0 mt-0.5" />
            <p className="text-[11px] text-content-secondary">
              <strong className="text-accent-amber font-semibold">Graph Coloring Rule:</strong>{" "}
              Adjacent vertices must receive distinct colors. This examination{" "}
              <strong>cannot share a timeslot</strong> with any of its{" "}
              <span className="font-mono font-bold text-accent-amber">{conflictingExams.length}</span> adjacent courses.
            </p>
          </div>
        )}
      </div>

      {/* Conflicting Neighbors List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-content-primary uppercase tracking-wider font-mono">
            Conflicting Courses ({conflictingExams.length})
          </span>
          {conflictingExams.length > 0 && (
            <span className="text-[10px] text-content-muted">
              Click course to focus
            </span>
          )}
        </div>

        {conflictingExams.length === 0 ? (
          <div className="py-8 text-center space-y-2 text-content-muted">
            <CalendarCheck size={28} className="mx-auto text-status-success opacity-80" />
            <p className="text-xs">No conflicting examinations for this course.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {conflictingExams.map(({ neighbor, weight, sharedStudents }) => {
              const isExpanded = Boolean(expandedStudents[neighbor.code]);

              return (
                <div
                  key={neighbor.code}
                  className="rounded-lg border border-border-subtle bg-surface-elevated/50 p-3 hover:border-accent-teal/60 transition-all text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectNeighbor(neighbor.code)}
                      className="text-left group flex-1 min-w-0"
                      title="Focus on this course node"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-accent-teal group-hover:underline">
                          {neighbor.code}
                        </span>
                        <ArrowsOutCardinal
                          size={12}
                          className="opacity-0 group-hover:opacity-100 text-accent-teal transition-opacity"
                        />
                      </div>
                      <p className="text-content-primary font-medium text-[11px] truncate mt-0.5">
                        {neighbor.name}
                      </p>
                    </button>

                    <span className="px-2 py-0.5 rounded bg-accent-amber/15 text-accent-amber border border-accent-amber/30 font-mono text-[10px] font-bold shrink-0">
                      {weight} student{weight === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Expandable shared student IDs */}
                  {sharedStudents.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border-subtle/60">
                      <button
                        type="button"
                        onClick={() => toggleExpand(neighbor.code)}
                        className="flex items-center gap-1 text-[11px] text-content-secondary hover:text-content-primary font-medium"
                      >
                        {isExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
                        <span>
                          {isExpanded ? "Hide" : "View"} {sharedStudents.length} common student
                          {sharedStudents.length === 1 ? "" : "s"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 rounded bg-base/60 border border-border-subtle">
                          {sharedStudents.map((id) => (
                            <span
                              key={id}
                              className="px-1.5 py-0.5 rounded bg-surface border border-border-subtle font-mono text-[10px] text-content-primary"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border-subtle bg-surface-elevated/40 flex items-center justify-between gap-2">
        <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
          Deselect Course
        </Button>
      </div>
    </div>
  );
};
