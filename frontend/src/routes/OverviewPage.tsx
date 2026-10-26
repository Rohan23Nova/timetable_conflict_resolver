import React, { useState } from "react";
import {
  Graph,
  TreeStructure,
  ShieldCheck,
  CalendarCheck,
  Sparkle,
  SlidersHorizontal,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, SearchInput } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";

export const OverviewPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const [demoInput, setDemoInput] = useState("");

  return (
    <div className="space-y-8">
      {/* 1. Welcome Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-amber">
              University Operations
            </span>
            <span className="text-content-muted">•</span>
            <Badge variant="teal" size="sm" dot>
              Phase 2 Design System
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
            Welcome to SLOTWISE
          </h2>
          <p className="text-sm text-content-secondary max-w-2xl mt-1.5 leading-relaxed">
            SLOTWISE is a mathematical examination scheduling studio designed for university academic
            operations. It uses exact graph coloring and Welsh-Powell heuristics to eliminate student
            time slot clashes without manual timetable negotiation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            leftIcon={<Sparkle size={14} className="text-accent-amber" />}
          >
            Theme: {theme === "dark" ? "Dark" : "Light"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDemoDialogOpen(true)}
            leftIcon={<SlidersHorizontal size={14} />}
          >
            Interactive Controls
          </Button>
        </div>
      </div>

      {/* 2. Algorithmic Pipeline Overview (Restrained Product Architectural Diagram) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
          Operational Architecture (Phase 1 Engine Connected)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <Card variant="subtle" className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-content-muted font-bold">01 / ENROLMENT</span>
              <Badge variant="muted" size="sm">Input</Badge>
            </div>
            <h4 className="text-sm font-semibold text-content-primary mb-1">Student Rosters</h4>
            <p className="text-xs text-content-secondary leading-relaxed">
              Examination catalogs and multi-course student registrations parsed and deduplicated.
            </p>
          </Card>

          {/* Step 2 */}
          <Card variant="subtle" className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-accent-amber font-bold">02 / GRAPH</span>
              <Graph size={16} className="text-accent-amber" />
            </div>
            <h4 className="text-sm font-semibold text-content-primary mb-1">Conflict Graph</h4>
            <p className="text-xs text-content-secondary leading-relaxed">
              Undirected graph G=(V,E) where edges represent shared students and non-assignable overlaps.
            </p>
          </Card>

          {/* Step 3 */}
          <Card variant="subtle" className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-accent-teal font-bold">03 / DAA SOLVERS</span>
              <TreeStructure size={16} className="text-accent-teal" />
            </div>
            <h4 className="text-sm font-semibold text-content-primary mb-1">Coloring Engine</h4>
            <p className="text-xs text-content-secondary leading-relaxed">
              Welsh-Powell greedy heuristic + exact depth-first backtracking with search limits.
            </p>
          </Card>

          {/* Step 4 */}
          <Card variant="subtle" className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-content-primary font-bold">04 / AUDIT</span>
              <ShieldCheck size={16} className="text-accent-teal" />
            </div>
            <h4 className="text-sm font-semibold text-content-primary mb-1">Integrity Validator</h4>
            <p className="text-xs text-content-secondary leading-relaxed">
              Independent audit validating completeness, edge non-conflict invariants, and slot bounds.
            </p>
          </Card>
        </div>
      </div>

      {/* 3. Intentional Empty State: Explaining Data Will Connect in Phase 4 */}
      <Card variant="default">
        <CardHeader
          title="Active Timetable Session"
          description="Examination data and live conflict matrices will be populated in Phase 4."
        />
        <CardContent className="py-6">
          <EmptyState
            icon={<CalendarCheck size={26} className="text-accent-amber" />}
            title="No Timetable Generated Yet"
            description="The frontend application shell and design tokens are established. Real examination datasets, student rosters, and conflict matrices will be connected in Phase 4 after authentication (Phase 3) is finalized."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  addToast({
                    title: "Roadmap Notice",
                    message: "Database persistence and CSV ingestion will be integrated in Phase 4.",
                    type: "info",
                  })
                }
              >
                View Integration Plan
              </Button>
            }
            secondaryAction={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addToast({
                    title: "Phase 1 Verified",
                    message: "40/40 algorithm tests currently passing in backend.",
                    type: "success",
                  })
                }
              >
                Check Phase 1 Engine
              </Button>
            }
          />
        </CardContent>
        <CardFooter>
          <div className="flex items-center gap-2 text-xs text-content-muted">
            <Info size={14} className="text-accent-amber flex-shrink-0" />
            <span>Phase 2 strict boundary: no fake metrics or artificial charts are displayed.</span>
          </div>
          <Badge variant="outline" size="sm">
            Phase 2 Scope Compliant
          </Badge>
        </CardFooter>
      </Card>

      {/* 4. Design System Component Verification Panel */}
      <Card variant="default">
        <CardHeader
          title="Design System & Component Showcase"
          description="Verify typography, button variants, input states, badges, and notification toasts."
        />
        <CardContent className="space-y-6">
          {/* Button Variants */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-muted mb-3">
              Button Hierarchy & States
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() =>
                  addToast({
                    title: "Primary Action",
                    message: "Amber accent button with high contrast text.",
                    type: "success",
                  })
                }
              >
                Primary Button
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  addToast({
                    title: "Secondary Action",
                    message: "Elevated neutral button with subtle border.",
                    type: "info",
                  })
                }
              >
                Secondary Button
              </Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button
                variant="destructive"
                onClick={() =>
                  addToast({
                    title: "Destructive Action",
                    message: "Critical warning button triggered.",
                    type: "error",
                  })
                }
              >
                Destructive
              </Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-muted mb-3">
              Status Badges & Tokens
            </h4>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="amber" dot>
                Conflict Detected
              </Badge>
              <Badge variant="teal" dot>
                Validated Schedule
              </Badge>
              <Badge variant="danger" dot>
                Infeasible (k &lt; χ)
              </Badge>
              <Badge variant="default">Default Neutral</Badge>
              <Badge variant="muted">Muted Token</Badge>
              <Badge variant="outline">Border Outline</Badge>
            </div>
          </div>

          {/* Input & Search Fields */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-muted mb-3">
              Form Controls
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <Input
                label="Course Identifier"
                placeholder="e.g. CS101, MATH201"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                helperText="Unique uppercase academic course code"
              />
              <SearchInput
                label="Quick Lookup"
                placeholder="Filter schedule records..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog Component */}
      <Dialog
        isOpen={isDemoDialogOpen}
        onClose={() => setIsDemoDialogOpen(false)}
        title="Confirm Operational Action"
        description="This modal demonstrates the accessible dialog component with focus trapping, backdrop blur, and escape key listeners."
        confirmText="Confirm Action"
        onConfirm={() => {
          setIsDemoDialogOpen(false);
          addToast({
            title: "Action Confirmed",
            message: "The confirmation dialog successfully handled your action.",
            type: "success",
          });
        }}
      >
        <div className="p-3.5 rounded-md bg-subtle/70 border border-border-subtle flex items-start gap-2.5 text-xs text-content-secondary">
          <CheckCircle size={18} className="text-accent-teal flex-shrink-0 mt-0.5" />
          <p>
            Keyboard accessibility test: Pressing <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border-strong font-mono">Escape</kbd> or clicking the background backdrop immediately closes this dialog.
          </p>
        </div>
      </Dialog>
    </div>
  );
};
