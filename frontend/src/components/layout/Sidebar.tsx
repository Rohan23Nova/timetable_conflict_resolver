import React from "react";
import { NavLink } from "react-router-dom";
import {
  House,
  GraduationCap,
  Student,
  Graph,
  CalendarDots,
  CalendarCheck,
  TreeStructure,
  FlowArrow,
  Database,
  GearSix,
  SidebarSimple,
} from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  phase?: string;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/app", icon: <House size={18} /> },
  { label: "Examinations", href: "/app/examinations", icon: <GraduationCap size={18} />, phase: "Phase 4" },
  { label: "Students & Enrolments", href: "/app/students", icon: <Student size={18} />, phase: "Phase 4" },
  { label: "Conflict Graph", href: "/app/conflict-graph", icon: <Graph size={18} />, phase: "Phase 4" },
  { label: "Generate Timetable", href: "/app/generate", icon: <CalendarDots size={18} />, phase: "Phase 4" },
  { label: "Timetable Calendar", href: "/app/calendar", icon: <CalendarCheck size={18} />, phase: "Phase 4" },
  { label: "Algorithm Laboratory", href: "/app/algorithms", icon: <TreeStructure size={18} />, phase: "Phase 4" },
  { label: "Results & Comparison", href: "/app/comparison", icon: <FlowArrow size={18} />, phase: "Phase 4" },
  { label: "Data Import/Export", href: "/app/import-export", icon: <Database size={18} />, phase: "Phase 4" },
  { label: "Settings", href: "/app/settings", icon: <GearSix size={18} />, phase: "Phase 4" },
];

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          role="presentation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-surface border-r border-border-subtle transition-all duration-200 select-none",
          isCollapsed ? "w-16" : "w-64",
          // Mobile responsive slide-in
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle flex-shrink-0">
          <NavLink
            to="/app"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden focus-visible:ring-1 rounded p-1"
          >
            {/* Branded Graphic Icon */}
            <div className="w-8 h-8 rounded-lg bg-[#111318] border border-border-strong flex items-center justify-center flex-shrink-0 shadow-subtle">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="8" r="2.5" fill="#F5A64A" />
                <circle cx="17" cy="7" r="2" fill="#69C9B1" />
                <circle cx="12" cy="17" r="2.5" fill="#F5A64A" />
                <line x1="7" y1="8" x2="17" y2="7" stroke="#F5A64A" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="7" y1="8" x2="12" y2="17" stroke="#69C9B1" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="17" y1="7" x2="12" y2="17" stroke="#F5A64A" strokeWidth="1.5" strokeOpacity="0.6" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-content-primary">SLOTWISE</span>
                <span className="text-[10px] text-content-muted uppercase tracking-wider font-medium truncate">
                  Exam Scheduling Studio
                </span>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-md text-content-muted hover:text-content-primary hover:bg-subtle transition-colors focus-visible:ring-1"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <SidebarSimple size={18} weight={isCollapsed ? "fill" : "regular"} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const navLink = (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/app"}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors group relative",
                    isActive
                      ? "bg-accent-amber/10 text-accent-amber font-semibold border-l-2 border-accent-amber"
                      : "text-content-secondary hover:text-content-primary hover:bg-subtle"
                  )
                }
              >
                <span className="flex-shrink-0 text-current">{item.icon}</span>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.phase && (
                      <Badge variant="muted" size="sm" className="ml-auto text-[10px] py-0 px-1.5 opacity-70">
                        {item.phase}
                      </Badge>
                    )}
                  </div>
                )}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip
                  key={item.href}
                  content={
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.phase && (
                        <span className="text-[10px] text-accent-amber font-mono">({item.phase})</span>
                      )}
                    </div>
                  }
                  position="right"
                >
                  {navLink}
                </Tooltip>
              );
            }

            return navLink;
          })}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-border-subtle flex-shrink-0">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-md bg-subtle/60 border border-border-subtle text-[11px] text-content-muted flex items-center justify-between">
              <div>
                <p className="font-semibold text-content-primary">Phase 2 Active</p>
                <p className="text-[10px] text-content-muted">Design System Shell</p>
              </div>
              <Badge variant="teal" size="sm" dot>
                Ready
              </Badge>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <span className="w-2 h-2 rounded-full bg-accent-teal" title="Phase 2 Active" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
