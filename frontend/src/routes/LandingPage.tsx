import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Graph,
  TreeStructure,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  Sparkle,
  FlowArrow,
  Check,
  WarningCircle,
  Database,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTheme } from "@/context/ThemeContext";

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeGraphTab, setActiveGraphTab] = useState<"uncolored" | "colored">("colored");

  return (
    <div className="min-h-screen bg-base text-content-primary flex flex-col selection:bg-accent-amber/20">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Mark & Wordmark */}
          <Link to="/" className="flex items-center gap-3 group focus-visible:ring-1 rounded p-1">
            <div className="w-8 h-8 rounded-lg bg-[#111318] border border-border-strong flex items-center justify-center flex-shrink-0 shadow-subtle group-hover:border-accent-amber transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="8" r="2.5" fill="#F5A64A" />
                <circle cx="17" cy="7" r="2" fill="#69C9B1" />
                <circle cx="12" cy="17" r="2.5" fill="#F5A64A" />
                <line x1="7" y1="8" x2="17" y2="7" stroke="#F5A64A" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="7" y1="8" x2="12" y2="17" stroke="#69C9B1" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="17" y1="7" x2="12" y2="17" stroke="#F5A64A" strokeWidth="1.5" strokeOpacity="0.6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-content-primary">SLOTWISE</span>
              <span className="text-[10px] text-content-muted uppercase tracking-wider font-medium">
                Exam Scheduling Studio
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-content-secondary">
            <a href="#graph-model" className="hover:text-content-primary transition-colors">
              Conflict Graph
            </a>
            <a href="#features" className="hover:text-content-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-content-primary transition-colors">
              How It Works
            </a>
            <a href="#algorithms" className="hover:text-content-primary transition-colors">
              Algorithm Comparison
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <Tooltip content={theme === "dark" ? "Light theme" : "Dark theme"} position="bottom">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-md text-content-secondary hover:text-content-primary hover:bg-subtle border border-border-subtle transition-colors focus-visible:ring-1"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun size={17} className="text-accent-amber" weight="bold" />
                ) : (
                  <Moon size={17} className="text-content-primary" weight="bold" />
                )}
              </button>
            </Tooltip>

            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>

            <Link to="/signup">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden border-b border-border-subtle">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border-subtle)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border-strong text-xs font-mono mb-6 shadow-subtle">
            <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
            <span className="text-content-secondary font-medium">Design & Analysis of Algorithms</span>
            <span className="text-content-muted">•</span>
            <span className="text-accent-amber font-semibold">Graph Coloring Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-content-primary tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Every exam has its place. <br />
            <span className="text-accent-amber font-serif italic font-normal">
              Every conflict has a solution.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-content-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
            SLOTWISE is a mathematical examination scheduling studio for university academic
            operations. Formulate examination clashes as conflict graphs, prove minimum slot
            feasibility, and eliminate student collision without manual negotiations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
            <Link to="/signup">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                Get Started Free
              </Button>
            </Link>
            <a href="#algorithms">
              <Button variant="secondary" size="lg" leftIcon={<TreeStructure size={16} />}>
                Compare Algorithms
              </Button>
            </a>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Enter Studio Shell
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-content-muted font-mono">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-accent-teal" /> Undirected Conflict Graph
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-accent-teal" /> Welsh-Powell Degree Ordering
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-accent-teal" /> Exact K-Coloring Backtracker
            </span>
          </div>
        </div>
      </section>

      {/* 3. Custom Conflict-Graph Illustration Section */}
      <section id="graph-model" className="py-20 bg-surface/50 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <Badge variant="amber" size="sm" dot className="mb-2">
              Graph-Theoretic Model
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
              From Student Rosters to Conflict Topologies
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary mt-2 leading-relaxed">
              When students enroll in multiple exams, each shared course pair forms an undirected edge.
              Examinations assigned the same color (time slot) cannot share any edge.
            </p>

            {/* Interactive Toggle for Graph Visualization */}
            <div className="inline-flex p-1 rounded-lg bg-surface border border-border-subtle mt-5">
              <button
                type="button"
                onClick={() => setActiveGraphTab("colored")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeGraphTab === "colored"
                    ? "bg-accent-amber text-[#111318] shadow-subtle"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                Resolved Timetable (3 Slots)
              </button>
              <button
                type="button"
                onClick={() => setActiveGraphTab("uncolored")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeGraphTab === "uncolored"
                    ? "bg-accent-amber text-[#111318] shadow-subtle"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                Unresolved Conflict Graph
              </button>
            </div>
          </div>

          {/* SVG Graph Canvas */}
          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-surface border border-border-strong shadow-card relative">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-amber" />
                <span className="text-xs font-mono font-semibold text-content-primary">
                  Conflict Graph G = (V, E)
                </span>
                <span className="text-[11px] text-content-muted font-mono">
                  (|V|=6 courses, |E|=7 student conflict edges)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                {activeGraphTab === "colored" ? (
                  <>
                    <span className="flex items-center gap-1 text-[#F5A64A]">
                      <span className="w-2 h-2 rounded-full bg-[#F5A64A]" /> Slot 1 (Morning)
                    </span>
                    <span className="flex items-center gap-1 text-[#69C9B1]">
                      <span className="w-2 h-2 rounded-full bg-[#69C9B1]" /> Slot 2 (Afternoon)
                    </span>
                    <span className="flex items-center gap-1 text-[#93C5FD]">
                      <span className="w-2 h-2 rounded-full bg-[#93C5FD]" /> Slot 3 (Evening)
                    </span>
                  </>
                ) : (
                  <span className="text-accent-danger flex items-center gap-1">
                    <WarningCircle size={14} /> 7 Potential Student Collisions
                  </span>
                )}
              </div>
            </div>

            {/* SVG Visual Diagram */}
            <div className="relative w-full h-80 flex items-center justify-center">
              <svg viewBox="0 0 600 300" className="w-full h-full">
                {/* Graph Edges */}
                {/* CS101(120, 80) to MATH201(280, 60) */}
                <line x1="120" y1="80" x2="280" y2="60" stroke="var(--color-border-strong)" strokeWidth="2" strokeDasharray={activeGraphTab === "uncolored" ? "4" : "0"} />
                {/* CS101(120, 80) to PHYS101(100, 220) */}
                <line x1="120" y1="80" x2="100" y2="220" stroke="var(--color-border-strong)" strokeWidth="2" />
                {/* MATH201(280, 60) to PHYS101(100, 220) (Triangle K3!) */}
                <line x1="280" y1="60" x2="100" y2="220" stroke="var(--color-border-strong)" strokeWidth="2" />
                {/* MATH201(280, 60) to CHEM101(460, 80) */}
                <line x1="280" y1="60" x2="460" y2="80" stroke="var(--color-border-strong)" strokeWidth="2" />
                {/* PHYS101(100, 220) to DATA301(280, 240) */}
                <line x1="100" y1="220" x2="280" y2="240" stroke="var(--color-border-strong)" strokeWidth="2" />
                {/* CHEM101(460, 80) to BIO101(480, 220) */}
                <line x1="460" y1="80" x2="480" y2="220" stroke="var(--color-border-strong)" strokeWidth="2" />
                {/* DATA301(280, 240) to BIO101(480, 220) */}
                <line x1="280" y1="240" x2="480" y2="220" stroke="var(--color-border-strong)" strokeWidth="2" />

                {/* Node CS101 */}
                <g transform="translate(120, 80)">
                  <circle r="26" fill={activeGraphTab === "colored" ? "#F5A64A" : "var(--color-bg-elevated)"} stroke="var(--color-border-strong)" strokeWidth="2" />
                  <text y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-primary)"}>CS101</text>
                  <text y="10" textAnchor="middle" fontSize="9" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-muted)"}>
                    {activeGraphTab === "colored" ? "Slot 1" : "deg: 2"}
                  </text>
                </g>

                {/* Node MATH201 */}
                <g transform="translate(280, 60)">
                  <circle r="26" fill={activeGraphTab === "colored" ? "#69C9B1" : "var(--color-bg-elevated)"} stroke="var(--color-border-strong)" strokeWidth="2" />
                  <text y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-primary)"}>MATH201</text>
                  <text y="10" textAnchor="middle" fontSize="9" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-muted)"}>
                    {activeGraphTab === "colored" ? "Slot 2" : "deg: 3"}
                  </text>
                </g>

                {/* Node PHYS101 */}
                <g transform="translate(100, 220)">
                  <circle r="26" fill={activeGraphTab === "colored" ? "#93C5FD" : "var(--color-bg-elevated)"} stroke="var(--color-border-strong)" strokeWidth="2" />
                  <text y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-primary)"}>PHYS101</text>
                  <text y="10" textAnchor="middle" fontSize="9" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-muted)"}>
                    {activeGraphTab === "colored" ? "Slot 3" : "deg: 3"}
                  </text>
                </g>

                {/* Node CHEM101 */}
                <g transform="translate(460, 80)">
                  <circle r="26" fill={activeGraphTab === "colored" ? "#F5A64A" : "var(--color-bg-elevated)"} stroke="var(--color-border-strong)" strokeWidth="2" />
                  <text y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-primary)"}>CHEM101</text>
                  <text y="10" textAnchor="middle" fontSize="9" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-muted)"}>
                    {activeGraphTab === "colored" ? "Slot 1" : "deg: 2"}
                  </text>
                </g>

                {/* Node DATA301 */}
                <g transform="translate(280, 240)">
                  <circle r="26" fill={activeGraphTab === "colored" ? "#F5A64A" : "var(--color-bg-elevated)"} stroke="var(--color-border-strong)" strokeWidth="2" />
                  <text y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-primary)"}>DATA301</text>
                  <text y="10" textAnchor="middle" fontSize="9" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-muted)"}>
                    {activeGraphTab === "colored" ? "Slot 1" : "deg: 2"}
                  </text>
                </g>

                {/* Node BIO101 */}
                <g transform="translate(480, 220)">
                  <circle r="26" fill={activeGraphTab === "colored" ? "#69C9B1" : "var(--color-bg-elevated)"} stroke="var(--color-border-strong)" strokeWidth="2" />
                  <text y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-primary)"}>BIO101</text>
                  <text y="10" textAnchor="middle" fontSize="9" fill={activeGraphTab === "colored" ? "#111318" : "var(--color-text-muted)"}>
                    {activeGraphTab === "colored" ? "Slot 2" : "deg: 2"}
                  </text>
                </g>
              </svg>
            </div>

            <div className="p-3.5 rounded-lg bg-subtle/50 border border-border-subtle mt-4 text-xs text-content-secondary flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-mono text-[11px]">
                Triangle K3 ({`{CS101, MATH201, PHYS101}`}) forces chromatic number χ ≥ 3.
              </span>
              <span className="text-accent-teal font-semibold flex items-center gap-1.5">
                <ShieldCheck size={16} /> Verified Zero Conflict Violations
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Section */}
      <section id="features" className="py-20 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="teal" size="sm" dot className="mb-2">
              Capabilities
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
              Engineered for Academic Scheduling Operations
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary mt-2 leading-relaxed">
              SLOTWISE replaces fragile spreadsheet scheduling with deterministic graph algorithms,
              strict constraints, and independent verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card variant="default">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber">
                  <Graph size={20} weight="bold" />
                </div>
                <h3 className="text-base font-semibold text-content-primary">
                  Automated Conflict-Graph Builder
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Processes examination catalogs and student registrations. Generates symmetric
                  undirected edges between all co-enrolled course pairs while automatically
                  deduplicating redundant records.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card variant="default">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center text-accent-teal">
                  <Sparkle size={20} weight="bold" />
                </div>
                <h3 className="text-base font-semibold text-content-primary">
                  Greedy Welsh-Powell Coloring
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Orders examinations by descending degree with deterministic tie-breaking.
                  Runs in fast O(V² + E) polynomial time, bounded by maximum degree Δ(G) + 1.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card variant="default">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber">
                  <TreeStructure size={20} weight="bold" />
                </div>
                <h3 className="text-base font-semibold text-content-primary">
                  Exact Backtracking K-Coloring
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Depth-first search exploring exact assignments within a fixed slot budget (k).
                  Exhaustively proves infeasibility when k &lt; χ(G) or terminates safely on node budgets.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card variant="default">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center text-accent-teal">
                  <ShieldCheck size={20} weight="bold" />
                </div>
                <h3 className="text-base font-semibold text-content-primary">
                  Independent Schedule Auditor
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  A separate validator that refuses to trust solver self-reports. Exhaustively audits
                  missing exams, unknown IDs, slot range bounds, and adjacent conflict violations.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card variant="default">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber">
                  <FlowArrow size={20} weight="bold" />
                </div>
                <h3 className="text-base font-semibold text-content-primary">
                  Decision Diagnostics & Metrics
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Inspect exact execution telemetry: search nodes explored, backtracks recorded,
                  elapsed computation time (ms), and mathematical proof flags in structured metadata.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card variant="default">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center text-accent-teal">
                  <Database size={20} weight="bold" />
                </div>
                <h3 className="text-base font-semibold text-content-primary">
                  Multi-Format Data Ingestion
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Flexible data adapters supporting university course catalogs, enrolment tuples,
                  dictionaries, and Pydantic schemas without web-framework coupling.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. Three-Step How It Works Section */}
      <section id="how-it-works" className="py-20 bg-surface/40 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="muted" size="sm" className="mb-2">
              Process
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
              Three Steps to Conflict-Free Schedules
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary mt-2 leading-relaxed">
              SLOTWISE transforms raw student enrolment records into verified academic timetables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-surface border border-border-subtle shadow-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber flex items-center justify-center font-mono font-bold text-lg mb-4">
                01
              </div>
              <h3 className="text-base font-semibold text-content-primary mb-2">Ingest Enrolments</h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Import course codes and student registrations. The builder parses records, rejects unknown
                course references, and handles exams with zero enrolled students.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-surface border border-border-subtle shadow-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-teal/10 border border-accent-teal/30 text-accent-teal flex items-center justify-center font-mono font-bold text-lg mb-4">
                02
              </div>
              <h3 className="text-base font-semibold text-content-primary mb-2">Build Conflict Graph</h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Vertices represent courses. Symmetrical undirected edges are created for every pair of
                exams sharing at least one common student, deduplicated via set hashing.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-surface border border-border-subtle shadow-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber flex items-center justify-center font-mono font-bold text-lg mb-4">
                03
              </div>
              <h3 className="text-base font-semibold text-content-primary mb-2">Solve & Validate</h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Run Welsh-Powell or exact Backtracking with your target slot count. The independent
                auditor verifies zero adjacent conflicts before exporting the schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Algorithm Comparison Section */}
      <section id="algorithms" className="py-20 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="amber" size="sm" dot className="mb-2">
              Theoretical Foundation
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
              Algorithmic Comparison: Heuristic vs. Exact
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary mt-2 leading-relaxed">
              Understanding the trade-offs between heuristic speed and exact chromatic determination.
              Greedy coloring is fast, but backtracking guarantees correctness under fixed constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Greedy Card */}
            <Card variant="default" className="flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                    <Sparkle size={18} className="text-accent-amber" />
                    Greedy Graph Coloring
                  </h3>
                  <Badge variant="amber" size="sm">Heuristic</Badge>
                </div>

                <div className="space-y-2.5 text-xs text-content-secondary leading-relaxed">
                  <p>
                    <strong className="text-content-primary font-semibold">Time Complexity:</strong>{" "}
                    O(|V|² + |E|) polynomial time.
                  </p>
                  <p>
                    <strong className="text-content-primary font-semibold">Vertex Ordering:</strong>{" "}
                    Welsh-Powell descending degree with alphabetical tie-breaking.
                  </p>
                  <p>
                    <strong className="text-content-primary font-semibold">Theoretical Bound:</strong>{" "}
                    Colors used are bounded by Δ(G) + 1, where Δ is maximum vertex degree.
                  </p>
                  <p className="p-3 rounded bg-accent-amber-muted/40 border border-accent-amber/20 text-content-primary">
                    <strong>Limitation:</strong> Order-dependent heuristic. Does not guarantee the
                    chromatic number χ(G). For certain graphs (e.g., Crown graphs), greedy can use up
                    to |V|/2 colors even on 2-colorable graphs.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Backtracking Card */}
            <Card variant="default" className="flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                    <TreeStructure size={18} className="text-accent-teal" />
                    Backtracking K-Coloring
                  </h3>
                  <Badge variant="teal" size="sm">Exact Solver</Badge>
                </div>

                <div className="space-y-2.5 text-xs text-content-secondary leading-relaxed">
                  <p>
                    <strong className="text-content-primary font-semibold">Time Complexity:</strong>{" "}
                    O(k^|V|) worst-case exponential time (NP-complete decision).
                  </p>
                  <p>
                    <strong className="text-content-primary font-semibold">Slot Guarantee:</strong>{" "}
                    Finds an assignment using at most k colors, or proves infeasibility.
                  </p>
                  <p>
                    <strong className="text-content-primary font-semibold">Safeguards:</strong>{" "}
                    Configurable search-node limits and wall-clock deadlines.
                  </p>
                  <p className="p-3 rounded bg-accent-teal-muted/40 border border-accent-teal/20 text-content-primary">
                    <strong>Infeasibility vs. Timeout:</strong> Exhaustive search mathematically
                    proves when k &lt; χ(G) (INFEASIBLE). Search node limits halt gracefully as
                    incomplete (LIMIT_EXCEEDED), never false infeasible.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-20 bg-surface/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card variant="elevated" className="p-8 sm:p-12 relative overflow-hidden">
            <div className="max-w-xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
                Ready to Resolve Exam Conflicts with Mathematical Rigor?
              </h2>
              <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                Step into the SLOTWISE studio. Verify our design system tokens, explore the
                conflict-graph architecture, and inspect our tested algorithmic solvers.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <Link to="/signup">
                  <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                    Create Administrator Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg">
                    Sign In to Studio
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-border-subtle py-8 px-4 sm:px-6 lg:px-8 text-xs text-content-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-content-primary">SLOTWISE</span>
            <span>— University Exam Scheduling Studio</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Phase 3: Public Surface & Auth Experience</span>
            <span>•</span>
            <a
              href="https://github.com/Rohan23Nova/timetable_conflict_resolver.git"
              target="_blank"
              rel="noreferrer"
              className="text-accent-amber hover:underline"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
