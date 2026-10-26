import React, { useState } from "react";
import { Info, CaretUp, CaretDown, CalendarCheck } from "@phosphor-icons/react";
import { getSlotTheme } from "@/lib/slotColors";

export interface GraphLegendProps {
  slotsUsed?: number;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ slotsUsed }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg shadow-card text-xs overflow-hidden transition-all duration-150 select-none max-h-96 overflow-y-auto"
      data-testid="graph-legend"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-surface-elevated/60 text-content-secondary hover:text-content-primary font-mono text-[11px] font-semibold border-b border-border-subtle sticky top-0 backdrop-blur-sm z-10"
      >
        <div className="flex items-center gap-1.5">
          <Info size={13} className="text-accent-amber" />
          <span>GRAPH NOTATION LEGEND</span>
        </div>
        {isOpen ? <CaretDown size={12} /> : <CaretUp size={12} />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 text-[11px]">
          {/* Active Schedule Slot Colors */}
          {Boolean(slotsUsed && slotsUsed > 0) && (
            <div className="pb-2 mb-2 border-b border-border-subtle space-y-1.5">
              <div className="flex items-center gap-1 font-mono text-[10px] text-accent-teal uppercase font-bold">
                <CalendarCheck size={12} />
                <span>Assigned Slots ({slotsUsed} total)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {Array.from({ length: slotsUsed! }, (_, i) => i + 1).map((slotNum) => {
                  const theme = getSlotTheme(slotNum);
                  return (
                    <div key={slotNum} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-xs border shrink-0"
                        style={{ backgroundColor: theme.hex, borderColor: theme.hex }}
                      />
                      <span className="font-mono text-[10px] text-content-primary font-semibold">
                        Slot {slotNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Node */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border-2 border-accent-amber bg-surface-elevated shadow-xs shrink-0" />
            <span className="text-content-secondary">
              <strong className="text-accent-amber">Selected Exam</strong> (Focus node)
            </span>
          </div>

          {/* Connected Neighbour */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border-2 border-accent-teal bg-surface-elevated shadow-xs shrink-0" />
            <span className="text-content-secondary">
              <strong className="text-accent-teal">Direct Neighbour</strong> (Color clash)
            </span>
          </div>

          {/* High Degree Hub */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-accent-amber/50 bg-accent-amber/15 shrink-0" />
            <span className="text-content-secondary">
              <strong className="text-content-primary">Hub Examination</strong> (Degree $d \ge 3$)
            </span>
          </div>

          {/* Isolated Node */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-status-success bg-status-success/10 shrink-0" />
            <span className="text-content-secondary">
              <strong className="text-status-success">Isolated Node</strong> ($d=0$, slot-free)
            </span>
          </div>

          {/* Conflict Edge */}
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-0.5 bg-accent-amber shrink-0" />
            <span className="text-content-secondary">
              <strong className="text-content-primary">Conflict Edge</strong> (Shared students)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
