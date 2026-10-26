import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewPage } from "./OverviewPage";
import { PlaceholderPage } from "./PlaceholderPage";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";

const NotFoundPage: React.FC = () => (
  <div className="py-16 text-center max-w-md mx-auto">
    <Card variant="default">
      <CardContent className="p-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mx-auto">
          <WarningCircle size={26} weight="bold" />
        </div>
        <h3 className="text-lg font-bold text-content-primary">Route Not Found</h3>
        <p className="text-xs text-content-secondary leading-relaxed">
          The requested path does not exist in the current application shell.
        </p>
        <Link to="/">
          <Button variant="primary" size="sm">
            Return to Overview
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: "overview",
        element: <Navigate to="/" replace />,
      },
      {
        path: "examinations",
        element: (
          <PlaceholderPage
            title="Examinations Catalog"
            description="Manage university courses, papers, exam codes, credit values, and session duration requirements."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Graph Model (Completed)",
              "Phase 3 Authentication & Role Permissions",
              "Phase 4 Examination Repository & Persistence",
            ]}
          />
        ),
      },
      {
        path: "students",
        element: (
          <PlaceholderPage
            title="Students & Enrolments"
            description="Manage student rosters and multi-course registrations that generate conflict edges."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Conflict Builder (Completed)",
              "Phase 3 Academic Admin Auth",
              "Phase 4 CSV Batch Ingestion & Validation",
            ]}
          />
        ),
      },
      {
        path: "conflict-graph",
        element: (
          <PlaceholderPage
            title="Conflict Graph Visualizer"
            description="Interactive graph inspection displaying vertices, adjacency lists, degrees, and shared enrolment cliques."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Symmetric Undirected ConflictGraph (Completed)",
              "Phase 4 Interactive Canvas / Force-Directed Graph UI",
            ]}
          />
        ),
      },
      {
        path: "generate",
        element: (
          <PlaceholderPage
            title="Timetable Generator"
            description="Execute timetable generation using configurable maximum slot counts (k) and ordering heuristics."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Welsh-Powell & Backtracking Solvers (Completed)",
              "Phase 4 Generation Job Queue & Execution Controls",
            ]}
          />
        ),
      },
      {
        path: "calendar",
        element: (
          <PlaceholderPage
            title="Timetable Calendar"
            description="Conflict-free examination timetable grid organized by date, session slot, and room assignments."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Non-Conflict Guarantee Engine (Completed)",
              "Phase 4 Grid Calendar & Export Formatter",
            ]}
          />
        ),
      },
      {
        path: "algorithms",
        element: (
          <PlaceholderPage
            title="Algorithm Laboratory"
            description="Inspect Welsh-Powell vs. Backtracking performance, search nodes explored, backtracks, and elapsed time."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Diagnostic Telemetry in metadata (Completed)",
              "Phase 4 Real-time Algorithmic Profiler UI",
            ]}
          />
        ),
      },
      {
        path: "comparison",
        element: (
          <PlaceholderPage
            title="Results & Comparison"
            description="Side-by-side benchmark of heuristic slot count vs. exact chromatic number and computation time."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 ColoringResult Schemas (Completed)",
              "Phase 4 Comparative Benchmark Tables",
            ]}
          />
        ),
      },
      {
        path: "import-export",
        element: (
          <PlaceholderPage
            title="Data Import / Export"
            description="Upload university CSV/JSON course rosters and export verified examination schedules."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 1 Input Builder Adapter (Completed)",
              "Phase 4 File Parsers (CSV, Excel, JSON)",
            ]}
          />
        ),
      },
      {
        path: "settings",
        element: (
          <PlaceholderPage
            title="Studio Settings"
            description="Configure default slot limits, examination session windows, algorithm timeouts, and institution metadata."
            targetPhase="Phase 4"
            dependencies={[
              "Phase 3 Institution Preferences",
              "Phase 4 Engine Configuration API",
            ]}
          />
        ),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});


