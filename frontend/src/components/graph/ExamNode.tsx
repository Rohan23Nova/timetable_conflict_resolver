import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { GraphVertex } from "@/types/api";
import { BookOpen, CheckCircle, Warning, CalendarCheck } from "@phosphor-icons/react";
import { getSlotTheme } from "@/lib/slotColors";

export interface ExamNodeData {
  vertex: GraphVertex;
  isSelected?: boolean;
  isNeighbor?: boolean;
  isDimmed?: boolean;
  isSearchMatch?: boolean;
  assignedSlot?: number;
}

export const ExamNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as ExamNodeData;
  const { vertex, isSelected, isNeighbor, isDimmed, isSearchMatch, assignedSlot } = nodeData;

  const isIsolated = vertex.degree === 0;
  const slotTheme = assignedSlot ? getSlotTheme(assignedSlot) : null;

  // Determine container styling based on selection, slot assignment, and state
  let containerClasses =
    "w-48 rounded-lg border bg-surface p-3 transition-all duration-200 select-none shadow-card text-left relative cursor-pointer ";

  if (isSelected) {
    containerClasses +=
      "border-accent-amber ring-2 ring-accent-amber/50 shadow-elevated bg-surface-elevated scale-105 z-30 ";
  } else if (isNeighbor) {
    containerClasses +=
      "border-accent-teal ring-2 ring-accent-teal/40 bg-surface-elevated shadow-subtle scale-102 z-20 ";
  } else if (isSearchMatch) {
    containerClasses +=
      "border-accent-amber ring-1 ring-accent-amber shadow-subtle z-10 ";
  } else if (isDimmed) {
    containerClasses += "opacity-25 border-border-subtle bg-surface/50 ";
  } else if (slotTheme) {
    // Scheduled state: tint border and background according to assigned time slot
    containerClasses += `${slotTheme.borderClass} ${slotTheme.bgClass} hover:shadow-subtle `;
  } else if (isIsolated) {
    containerClasses += "border-dashed border-status-success/40 hover:border-status-success ";
  } else {
    containerClasses += "border-border-strong hover:border-accent-amber/60 hover:shadow-subtle ";
  }

  // Degree badge color
  let degreeBadgeClasses = "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ";
  if (isIsolated) {
    degreeBadgeClasses += "bg-status-success/10 text-status-success border border-status-success/20";
  } else if (vertex.degree >= 3) {
    degreeBadgeClasses += "bg-accent-amber/20 text-accent-amber border border-accent-amber/30";
  } else {
    degreeBadgeClasses += "bg-subtle text-content-secondary border border-border-subtle";
  }

  return (
    <div className={containerClasses} data-testid={`exam-node-${vertex.code}`}>
      {/* Invisible Handles on All 4 Cardinal Directions for Clean Dynamic Docking */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-src"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-src"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-src"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-src"
        className="opacity-0 w-2 h-2 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="center"
        className="opacity-0 w-1 h-1 pointer-events-none"
        style={{ left: "50%", top: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="center"
        className="opacity-0 w-1 h-1 pointer-events-none"
        style={{ left: "50%", top: "50%" }}
      />

      {/* Node Header: Code, Slot Pill, and Degree Badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-xs text-accent-amber tracking-tight truncate">
            {vertex.code}
          </span>
          {isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
          )}
          {isNeighbor && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {slotTheme && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${slotTheme.badgeClass}`}
              title={`Assigned Time Slot ${assignedSlot}`}
              data-testid={`slot-badge-${vertex.code}`}
            >
              Slot {assignedSlot}
            </span>
          )}
          <span
            className={degreeBadgeClasses}
            title={`Conflict Degree: ${vertex.degree} conflicting course(s)`}
          >
            {isIsolated ? "d=0" : `d=${vertex.degree}`}
          </span>
        </div>
      </div>

      {/* Node Body: Course Name */}
      <div className="text-xs font-medium text-content-primary line-clamp-2 leading-snug mb-2">
        {vertex.name}
      </div>

      {/* Node Footer: Department & Status Tag */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border-subtle/60 text-[10px] text-content-muted">
        <span className="truncate max-w-[110px]" title={vertex.department || "General"}>
          {vertex.department || vertex.semester || "General"}
        </span>

        {slotTheme ? (
          <span className={`inline-flex items-center gap-0.5 font-medium ${slotTheme.textClass}`}>
            <CalendarCheck size={10} weight="bold" />
            <span>Scheduled</span>
          </span>
        ) : isIsolated ? (
          <span className="inline-flex items-center gap-0.5 text-status-success font-medium">
            <CheckCircle size={10} weight="bold" />
            <span>Isolated</span>
          </span>
        ) : vertex.degree >= 3 ? (
          <span className="inline-flex items-center gap-0.5 text-accent-amber font-medium">
            <Warning size={10} weight="bold" />
            <span>Hub</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-content-secondary">
            <BookOpen size={10} />
            <span>{vertex.degree} clash{vertex.degree === 1 ? "" : "es"}</span>
          </span>
        )}
      </div>
    </div>
  );
});

ExamNode.displayName = "ExamNode";
