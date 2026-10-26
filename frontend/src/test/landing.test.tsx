import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { LandingPage } from "../routes/LandingPage";

const renderLandingPage = () => {
  return render(
    <ThemeProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LandingPage />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe("Public Landing Page", () => {
  it("renders primary and supporting brand messages", () => {
    renderLandingPage();

    // Primary & supporting hero messages
    expect(screen.getByText(/Every exam has its place/i)).toBeInTheDocument();
    expect(screen.getByText(/Every conflict has a solution/i)).toBeInTheDocument();

    // Brand and descriptor
    expect(screen.getAllByText("SLOTWISE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exam Scheduling Studio").length).toBeGreaterThan(0);
  });

  it("renders conflict-graph model section and toggles visualization state", () => {
    renderLandingPage();

    // Conflict graph section heading
    expect(screen.getByText("From Student Rosters to Conflict Topologies")).toBeInTheDocument();

    // Default tab: Resolved Timetable
    expect(screen.getByText(/Slot 1 \(Morning\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Slot 2 \(Afternoon\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Slot 3 \(Evening\)/i)).toBeInTheDocument();

    // Toggle to Unresolved Conflict Graph
    const uncoloredButton = screen.getByRole("button", { name: "Unresolved Conflict Graph" });
    fireEvent.click(uncoloredButton);

    expect(screen.getByText(/7 Potential Student Collisions/i)).toBeInTheDocument();
  });

  it("renders 3-step How It Works section", () => {
    renderLandingPage();

    expect(screen.getByText("Three Steps to Conflict-Free Schedules")).toBeInTheDocument();
    expect(screen.getByText("Ingest Enrolments")).toBeInTheDocument();
    expect(screen.getByText("Build Conflict Graph")).toBeInTheDocument();
    expect(screen.getByText("Solve & Validate")).toBeInTheDocument();
  });

  it("renders Algorithm Comparison section with trade-offs", () => {
    renderLandingPage();

    expect(screen.getByText("Algorithmic Comparison: Heuristic vs. Exact")).toBeInTheDocument();
    expect(screen.getByText("Greedy Graph Coloring")).toBeInTheDocument();
    expect(screen.getByText("Backtracking K-Coloring")).toBeInTheDocument();
    expect(screen.getByText(/Welsh-Powell descending degree/i)).toBeInTheDocument();
    expect(screen.getByText(/O\(k\^\|V\|\) worst-case exponential/i)).toBeInTheDocument();
  });

  it("renders public navigation and CTA links", () => {
    renderLandingPage();

    // Header buttons
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Enter Studio Shell" })).toHaveAttribute("href", "/login");
  });
});
