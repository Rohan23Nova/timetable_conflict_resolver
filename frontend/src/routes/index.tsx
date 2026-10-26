import React from "react";
import { createBrowserRouter, Navigate, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";
import { OverviewPage } from "./OverviewPage";
import { ExaminationsPage } from "./ExaminationsPage";
import { StudentsPage } from "./StudentsPage";
import { ConflictGraphPage } from "./ConflictGraphPage";
import { AlgorithmLabPage } from "./AlgorithmLabPage";
import { PlaceholderPage } from "./PlaceholderPage";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WarningCircle, House, ArrowRight } from "@phosphor-icons/react";

export const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-base flex items-center justify-center p-6">
    <Card variant="default" className="max-w-md w-full shadow-card text-center">
      <CardContent className="p-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mx-auto">
          <WarningCircle size={26} weight="bold" />
        </div>
        <h3 className="text-lg font-bold text-content-primary">Route Not Found</h3>
        <p className="text-xs text-content-secondary leading-relaxed">
          The requested path does not exist in the SLOTWISE studio application.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="secondary" size="sm" leftIcon={<House size={14} />}>
              Landing Page
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
              Studio Shell
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const router = createBrowserRouter(
  [
    /* Public Routes */
    {
      path: "/",
      element: <LandingPage />,
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/signup",
      element: <SignupPage />,
    },

    /* Studio Shell Routes (requireAuth=false in Development Mode) */
    {
      path: "/app",
      element: (
        <ProtectedRoute requireAuth={false}>
          <AppShell />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <OverviewPage />,
        },
        {
          path: "overview",
          element: <Navigate to="/app" replace />,
        },
        {
          path: "examinations",
          element: <ExaminationsPage />,
        },
        {
          path: "students",
          element: <StudentsPage />,
        },
        {
          path: "conflict-graph",
          element: <ConflictGraphPage />,
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
          element: <AlgorithmLabPage />,
        },
        {
          path: "algorithm-lab",
          element: <AlgorithmLabPage />,
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
      ],
    },

    /* Direct redirects from root aliases to /app */
    { path: "/overview", element: <Navigate to="/app" replace /> },
    { path: "/examinations", element: <Navigate to="/app/examinations" replace /> },
    { path: "/students", element: <Navigate to="/app/students" replace /> },
    { path: "/conflict-graph", element: <Navigate to="/app/conflict-graph" replace /> },
    { path: "/generate", element: <Navigate to="/app/generate" replace /> },
    { path: "/calendar", element: <Navigate to="/app/calendar" replace /> },
    { path: "/algorithms", element: <Navigate to="/app/algorithms" replace /> },
    { path: "/algorithm-lab", element: <Navigate to="/app/algorithms" replace /> },
    { path: "/comparison", element: <Navigate to="/app/comparison" replace /> },
    { path: "/import-export", element: <Navigate to="/app/import-export" replace /> },
    { path: "/settings", element: <Navigate to="/app/settings" replace /> },

    /* Catch-all 404 */
    {
      path: "*",
      element: <NotFoundPage />,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);
