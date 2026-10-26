import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { AppShell } from "../components/layout/AppShell";
import { OverviewPage } from "../routes/OverviewPage";
import { PlaceholderPage } from "../routes/PlaceholderPage";

const renderWithRouter = (initialRoute = "/") => {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter
          initialEntries={[initialRoute]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route
                path="examinations"
                element={
                  <PlaceholderPage
                    title="Examinations Catalog"
                    description="Manage university courses."
                    targetPhase="Phase 4"
                    dependencies={["Phase 1 Graph Model (Completed)"]}
                  />
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>
  );
};

describe("Navigation & App Shell Behavior", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders brand mark, descriptor, and overview page", () => {
    renderWithRouter("/");

    // Verify Brand title & product descriptor
    expect(screen.getAllByText("SLOTWISE").length).toBeGreaterThan(0);
    expect(screen.getByText("Exam Scheduling Studio")).toBeInTheDocument();
    expect(screen.getByText("Welcome to SLOTWISE")).toBeInTheDocument();
  });

  it("navigates to placeholder route and renders roadmap status", () => {
    renderWithRouter("/");

    // Click on Examinations link in sidebar
    const examLinks = screen.getAllByText("Examinations");
    fireEvent.click(examLinks[0]);

    // Check placeholder rendered
    expect(screen.getByText("Examinations Catalog")).toBeInTheDocument();
    expect(screen.getByText("Manage university courses.")).toBeInTheDocument();
    expect(screen.getByText("Reserved for Phase 4")).toBeInTheDocument();
    expect(screen.getByText("Phase 1 Graph Model (Completed)")).toBeInTheDocument();
  });

  it("toggles desktop sidebar collapse state", () => {
    renderWithRouter("/");

    const collapseButton = screen.getByLabelText("Collapse sidebar");
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton);
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Expand sidebar"));
    expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
  });
});
