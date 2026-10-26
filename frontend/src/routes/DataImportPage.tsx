import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UploadSimple,
  DownloadSimple,
  FileCsv,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowsClockwise,
  Sparkle,
  GraduationCap,
  Student,
  Graph,
  ArrowRight,
  ShieldCheck,
  Check,
  Warning,
} from "@phosphor-icons/react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { apiClient } from "@/services/apiClient";
import type {
  ImportType,
  ImportStrategy,
  ImportPreviewResponse,
  ImportCommitResponse,
  SampleDatasetPreviewResponse,
  SampleDatasetLoadResponse,
} from "@/types/api";

type ActiveTab = "importer" | "studio" | "templates";

export const DataImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("importer");

  // Importer state
  const [selectedType, setSelectedType] = useState<ImportType>("exams");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rowStatusFilter, setRowStatusFilter] = useState<"all" | "valid" | "error" | "warning">("all");
  const [strategy, setStrategy] = useState<ImportStrategy>("atomic");
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  // Sample Dataset Studio state
  const [samplePreview, setSamplePreview] = useState<SampleDatasetPreviewResponse | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleLoadMode, setSampleLoadMode] = useState<"append" | "replace">("append");
  const [sampleLoadResult, setSampleLoadResult] = useState<SampleDatasetLoadResponse | null>(null);
  const [sampleLoadError, setSampleLoadError] = useState<string | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  // Load sample dataset preview on mount or tab change
  useEffect(() => {
    if (activeTab === "studio" && !samplePreview) {
      apiClient.imports
        .sampleDatasetPreview()
        .then((data) => setSamplePreview(data))
        .catch((err) => {
          console.error("Failed to load sample dataset preview:", err);
        });
    }
  }, [activeTab, samplePreview]);

  // Handle file drop / selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(null);
      setPreviewError(null);
      setCommitResult(null);
      setCommitError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      setPreview(null);
      setPreviewError(null);
      setCommitResult(null);
      setCommitError(null);
    }
  };

  // Trigger CSV parse & validation
  const handleValidateCsv = async () => {
    if (!file) return;
    setIsValidating(true);
    setPreviewError(null);
    setCommitResult(null);
    setCommitError(null);

    try {
      const res = await apiClient.imports.preview(selectedType, file);
      setPreview(res);
      // Auto-select valid_only if there are invalid rows
      if (res.invalid_rows > 0) {
        setStrategy("valid_only");
      } else {
        setStrategy("atomic");
      }
    } catch (err: any) {
      setPreviewError(err?.message || "Failed to validate CSV file. Ensure it is a valid UTF-8 CSV.");
    } finally {
      setIsValidating(false);
    }
  };

  // Commit validated batch
  const handleCommit = async () => {
    if (!preview) return;
    setIsCommitting(true);
    setCommitError(null);

    try {
      const res = await apiClient.imports.commit(selectedType, {
        preview_id: preview.preview_id,
        import_type: selectedType,
        strategy,
      });
      setCommitResult(res);
      setPreview(null);
      setFile(null);
    } catch (err: any) {
      setCommitError(err?.message || "Failed to commit import records to database.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Handle sample dataset loading
  const executeSampleLoad = async (mode: "append" | "replace") => {
    setSampleLoading(true);
    setSampleLoadError(null);
    setSampleLoadResult(null);
    try {
      const res = await apiClient.imports.sampleDatasetLoad(mode);
      setSampleLoadResult(res);
    } catch (err: any) {
      setSampleLoadError(err?.message || "Failed to load sample dataset into database.");
    } finally {
      setSampleLoading(false);
      setShowReplaceModal(false);
    }
  };

  const filteredRows = preview?.rows.filter((r) => {
    if (rowStatusFilter === "all") return true;
    return r.status === rowStatusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Studio Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              Data Import & Sample Studio
            </h1>
            <Badge variant="muted" size="sm">
              Phase 9
            </Badge>
          </div>
          <p className="text-sm text-content-secondary mt-1">
            Upload institutional CSV rosters, perform pre-flight transactional validation, or load realistic university benchmarks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-surface-subtle border border-border-subtle rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("importer")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "importer"
                ? "bg-surface text-content-primary shadow-subtle border border-border-subtle"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <UploadSimple size={14} weight="bold" />
            CSV Importer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "studio"
                ? "bg-surface text-content-primary shadow-subtle border border-border-subtle"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <Sparkle size={14} weight="bold" />
            Sample Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "templates"
                ? "bg-surface text-content-primary shadow-subtle border border-border-subtle"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <FileCsv size={14} weight="bold" />
            Template Specs
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CSV BATCH IMPORTER                                                 */}
      {/* ========================================================================= */}
      {activeTab === "importer" && (
        <div className="space-y-6">
          {/* Post-Commit Result Alert */}
          {commitResult && (
            <Card variant="outlined" className="border-accent-emerald/40 bg-accent-emerald/5 shadow-subtle">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-emerald/15 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald flex-shrink-0">
                    <CheckCircle size={22} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-content-primary">Import Batch Successfully Committed</h3>
                      <Badge variant="teal" size="sm">
                        {commitResult.strategy.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-content-secondary mt-1">{commitResult.message}</p>

                    {/* Operational Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-accent-emerald/20">
                      <div>
                        <span className="text-[11px] font-medium text-content-muted uppercase">Inserted</span>
                        <p className="text-base font-bold text-accent-emerald">{commitResult.inserted_count}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-content-muted uppercase">Skipped</span>
                        <p className="text-base font-bold text-content-secondary">{commitResult.skipped_count}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-content-muted uppercase">Rejected</span>
                        <p className="text-base font-bold text-accent-rose">{commitResult.rejected_count}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-content-muted uppercase">Graph Vertices</span>
                        <p className="text-base font-bold text-accent-primary">{commitResult.resulting_graph_vertices}</p>
                      </div>
                    </div>

                    {/* Stale Schedule Warning */}
                    {commitResult.is_schedule_stale && (
                      <div className="mt-4 p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/30 flex items-start gap-3">
                        <Warning size={18} weight="fill" className="text-accent-amber flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-accent-amber">
                            Existing Timetables Require Recalculation
                          </p>
                          <p className="text-[11px] text-content-secondary mt-0.5 leading-relaxed">
                            Course additions or enrolment updates changed the conflict graph fingerprint. Previously generated schedules may now contain slot conflicts or unassigned courses.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Navigation shortcuts */}
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <Link to="/app/conflict-graph">
                        <Button variant="secondary" size="sm" leftIcon={<Graph size={14} />}>
                          Explore Conflict Graph
                        </Button>
                      </Link>
                      <Link to="/app/algorithms">
                        <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                          Generate Timetable in Lab
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCommitResult(null);
                        }}
                      >
                        Import Another File
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Select CSV Type */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
                Step 1: Choose Dataset Type
              </span>
              <a
                href={apiClient.imports.getTemplateUrl(selectedType)}
                download
                className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-medium"
              >
                <DownloadSimple size={14} />
                Download {selectedType} template (.csv)
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Examinations Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType("exams");
                  setFile(null);
                  setPreview(null);
                }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedType === "exams"
                    ? "bg-accent-primary/5 border-accent-primary ring-1 ring-accent-primary/20 shadow-subtle"
                    : "bg-surface border-border-subtle hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-accent-amber/10 text-accent-amber flex items-center justify-center">
                    <GraduationCap size={18} weight="bold" />
                  </div>
                  {selectedType === "exams" && (
                    <div className="w-5 h-5 rounded-full bg-accent-primary text-white flex items-center justify-center">
                      <Check size={12} weight="bold" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold text-content-primary mt-3">Examinations</h3>
                <p className="text-xs text-content-secondary mt-1 line-clamp-2">
                  Course codes, subject titles, departments, semesters, and examination durations.
                </p>
                <div className="mt-3 text-[11px] font-mono text-content-muted">
                  Required: exam_code, subject_name
                </div>
              </button>

              {/* Students Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType("students");
                  setFile(null);
                  setPreview(null);
                }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedType === "students"
                    ? "bg-accent-primary/5 border-accent-primary ring-1 ring-accent-primary/20 shadow-subtle"
                    : "bg-surface border-border-subtle hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                    <Student size={18} weight="bold" />
                  </div>
                  {selectedType === "students" && (
                    <div className="w-5 h-5 rounded-full bg-accent-primary text-white flex items-center justify-center">
                      <Check size={12} weight="bold" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold text-content-primary mt-3">Students</h3>
                <p className="text-xs text-content-secondary mt-1 line-clamp-2">
                  Student identifier codes and student legal/display names.
                </p>
                <div className="mt-3 text-[11px] font-mono text-content-muted">
                  Required: student_id
                </div>
              </button>

              {/* Enrolments Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType("enrolments");
                  setFile(null);
                  setPreview(null);
                }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedType === "enrolments"
                    ? "bg-accent-primary/5 border-accent-primary ring-1 ring-accent-primary/20 shadow-subtle"
                    : "bg-surface border-border-subtle hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-accent-emerald/10 text-accent-emerald flex items-center justify-center">
                    <Graph size={18} weight="bold" />
                  </div>
                  {selectedType === "enrolments" && (
                    <div className="w-5 h-5 rounded-full bg-accent-primary text-white flex items-center justify-center">
                      <Check size={12} weight="bold" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold text-content-primary mt-3">Course Enrolments</h3>
                <p className="text-xs text-content-secondary mt-1 line-clamp-2">
                  Maps students to enrolled examinations. Generates graph conflict edges.
                </p>
                <div className="mt-3 text-[11px] font-mono text-content-muted">
                  Required: student_id, exam_code
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Upload CSV File */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
              Step 2: Upload CSV File
            </span>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragOver
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border-subtle hover:border-border-strong bg-surface"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center mx-auto text-content-muted">
                <FileCsv size={28} weight="duotone" />
              </div>
              <h4 className="text-sm font-bold text-content-primary mt-3">
                Drag and drop your {selectedType} CSV file here
              </h4>
              <p className="text-xs text-content-muted mt-1">
                Standard RFC 4180 CSV format, UTF-8 or ASCII encoded, up to 5MB (max 5,000 rows).
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-subtle border border-border-subtle hover:bg-surface text-content-primary shadow-xs transition-colors">
                    <UploadSimple size={14} />
                    Browse Local File
                  </span>
                </label>
              </div>

              {file && (
                <div className="mt-4 p-3 bg-surface-subtle border border-border-subtle rounded-lg max-w-md mx-auto flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCsv size={20} className="text-accent-primary flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-content-primary truncate">{file.name}</p>
                      <p className="text-[11px] text-content-muted">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleValidateCsv}
                    isLoading={isValidating}
                    leftIcon={<ShieldCheck size={14} />}
                  >
                    Validate File
                  </Button>
                </div>
              )}
            </div>

            {previewError && (
              <div className="p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs flex items-start gap-3">
                <XCircle size={18} weight="fill" className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Validation Failed</p>
                  <p className="mt-0.5 text-content-secondary leading-relaxed">{previewError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Validation Preview & Analysis */}
          {preview && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
                  Step 3: Validation Preview & Audit Report
                </span>
                <a
                  href={apiClient.imports.getReportUrl(preview.preview_id)}
                  download
                  className="text-xs text-content-primary hover:text-accent-primary flex items-center gap-1 font-medium bg-surface-subtle border border-border-subtle px-2.5 py-1 rounded-md"
                >
                  <DownloadSimple size={14} />
                  Download Validation CSV Report
                </a>
              </div>

              {/* Missing Headers Fatal Warning */}
              {preview.missing_required_headers.length > 0 && (
                <div className="p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <XCircle size={16} weight="fill" />
                    Fatal Column Header Error
                  </p>
                  <p className="text-content-secondary">
                    The uploaded CSV is missing mandatory columns:{" "}
                    <span className="font-mono font-semibold text-accent-rose">
                      {preview.missing_required_headers.join(", ")}
                    </span>
                    . Please download the sample template to inspect the expected column headers.
                  </p>
                </div>
              )}

              {/* Validation Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-surface border border-border-subtle">
                  <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
                    Total Rows
                  </span>
                  <p className="text-xl font-bold text-content-primary mt-1">{preview.total_rows}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/20">
                  <span className="text-[11px] font-medium text-accent-emerald uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle size={12} weight="bold" />
                    Valid Records
                  </span>
                  <p className="text-xl font-bold text-accent-emerald mt-1">{preview.valid_rows}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent-rose/5 border border-accent-rose/20">
                  <span className="text-[11px] font-medium text-accent-rose uppercase tracking-wider flex items-center gap-1">
                    <XCircle size={12} weight="bold" />
                    Fatal Errors
                  </span>
                  <p className="text-xl font-bold text-accent-rose mt-1">{preview.invalid_rows}</p>
                </div>
                <div className="p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
                  <span className="text-[11px] font-medium text-accent-amber uppercase tracking-wider flex items-center gap-1">
                    <WarningCircle size={12} weight="bold" />
                    Warnings (Skipped)
                  </span>
                  <p className="text-xl font-bold text-accent-amber mt-1">{preview.warning_rows}</p>
                </div>
              </div>

              {/* Row Preview Table */}
              <Card variant="outlined">
                <CardHeader className="py-3 px-4 border-b border-border-subtle flex flex-row items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-content-muted">
                    Row-by-Row Diagnostic Inspection
                  </h3>
                  {/* Status Filters */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRowStatusFilter("all")}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        rowStatusFilter === "all"
                          ? "bg-surface-strong text-content-primary"
                          : "text-content-muted hover:text-content-primary"
                      }`}
                    >
                      All ({preview.rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRowStatusFilter("valid")}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        rowStatusFilter === "valid"
                          ? "bg-accent-emerald/20 text-accent-emerald font-semibold"
                          : "text-content-muted hover:text-content-primary"
                      }`}
                    >
                      Valid ({preview.valid_rows})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRowStatusFilter("error")}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        rowStatusFilter === "error"
                          ? "bg-accent-rose/20 text-accent-rose font-semibold"
                          : "text-content-muted hover:text-content-primary"
                      }`}
                    >
                      Errors ({preview.invalid_rows})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRowStatusFilter("warning")}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        rowStatusFilter === "warning"
                          ? "bg-accent-amber/20 text-accent-amber font-semibold"
                          : "text-content-muted hover:text-content-primary"
                      }`}
                    >
                      Warnings ({preview.warning_rows})
                    </button>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-subtle text-content-muted font-medium border-b border-border-subtle sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-16">Line</th>
                        <th className="py-2 px-3 w-24">Status</th>
                        <th className="py-2 px-3">Parsed Record Data</th>
                        <th className="py-2 px-3">Validation Diagnostic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredRows && filteredRows.length > 0 ? (
                        filteredRows.map((r) => (
                          <tr
                            key={r.row_number}
                            className={`hover:bg-surface-subtle/50 transition-colors ${
                              r.status === "error"
                                ? "bg-accent-rose/5"
                                : r.status === "warning"
                                ? "bg-accent-amber/5"
                                : ""
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-content-muted">{r.row_number}</td>
                            <td className="py-2 px-3">
                              {r.status === "valid" && (
                                <Badge variant="teal" size="sm">
                                  Valid
                                </Badge>
                              )}
                              {r.status === "error" && (
                                <Badge variant="danger" size="sm">
                                  Error
                                </Badge>
                              )}
                              {r.status === "warning" && (
                                <Badge variant="amber" size="sm">
                                  Warning
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-content-secondary max-w-xs truncate">
                              {Object.entries(r.data)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(", ")}
                            </td>
                            <td className="py-2 px-3">
                              {r.errors.length > 0 && (
                                <p className="text-accent-rose font-medium text-[11px]">
                                  {r.errors.join("; ")}
                                </p>
                              )}
                              {r.warnings.length > 0 && (
                                <p className="text-accent-amber text-[11px]">{r.warnings.join("; ")}</p>
                              )}
                              {r.errors.length === 0 && r.warnings.length === 0 && (
                                <span className="text-content-muted text-[11px] italic">Ready for import</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-content-muted">
                            No rows matching selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Step 4: Import Strategy Selector & Commit */}
              <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-4">
                <span className="text-xs font-bold text-content-muted uppercase tracking-wider block">
                  Step 4: Select Commit Strategy & Commit
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Atomic Strategy */}
                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      strategy === "atomic"
                        ? "bg-accent-primary/5 border-accent-primary"
                        : "bg-surface-subtle border-border-subtle hover:border-border-strong"
                    } ${!preview.can_commit_atomic ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="atomic"
                      checked={strategy === "atomic"}
                      disabled={!preview.can_commit_atomic}
                      onChange={() => setStrategy("atomic")}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-content-primary">
                          Atomic All-or-Nothing (Strict)
                        </span>
                        {preview.can_commit_atomic ? (
                          <Badge variant="teal" size="sm">
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="muted" size="sm">
                            Disabled (Errors Present)
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-content-secondary mt-1 leading-relaxed">
                        Strict university standard. Commits the entire file only if 100% of rows pass validation. If any error occurs, database rolls back completely.
                      </p>
                    </div>
                  </label>

                  {/* Valid-Only Strategy */}
                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      strategy === "valid_only"
                        ? "bg-accent-primary/5 border-accent-primary"
                        : "bg-surface-subtle border-border-subtle hover:border-border-strong"
                    } ${!preview.can_commit_valid_only ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="valid_only"
                      checked={strategy === "valid_only"}
                      disabled={!preview.can_commit_valid_only}
                      onChange={() => setStrategy("valid_only")}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-content-primary">
                          Valid-Only Mode (Permissive)
                        </span>
                        {preview.can_commit_valid_only && (
                          <Badge variant="amber" size="sm">
                            Skip Errors
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-content-secondary mt-1 leading-relaxed">
                        Imports all valid records ({preview.valid_rows}) and silently skips rows with validation issues. Download the audit report to inspect skipped rows.
                      </p>
                    </div>
                  </label>
                </div>

                {commitError && (
                  <div className="p-3 rounded-lg bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs">
                    {commitError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreview(null);
                      setFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCommit}
                    isLoading={isCommitting}
                    disabled={
                      (strategy === "atomic" && !preview.can_commit_atomic) ||
                      (strategy === "valid_only" && !preview.can_commit_valid_only)
                    }
                    rightIcon={<ArrowRight size={16} />}
                  >
                    Commit {preview.valid_rows} Records to Database
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SAMPLE DATASET STUDIO                                              */}
      {/* ========================================================================= */}
      {activeTab === "studio" && (
        <div className="space-y-6">
          {/* Overview Hero Card */}
          <Card variant="outlined" className="bg-surface shadow-subtle border-border-subtle">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent-amber/15 border border-accent-amber/30 text-accent-amber flex items-center justify-center">
                      <Sparkle size={18} weight="fill" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-content-primary">
                        Standard University Benchmark Dataset
                      </h2>
                      <span className="text-xs text-content-muted">
                        Realistic multi-department examination scheduling benchmark
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-content-secondary mt-3 leading-relaxed max-w-3xl">
                    {samplePreview?.description ||
                      "A realistic 15-examination dataset modeling undergraduate engineering, science, economics, and humanities. Contains high-conflict hubs (CS101, MATH101, PHYS101), multi-cohort shared enrolments, and an isolated paper (ENG101) requiring graph coloring algorithms."}
                  </p>
                </div>

                <Badge variant="amber" size="md">
                  Benchmark v2.0
                </Badge>
              </div>

              {/* Structural Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-border-subtle">
                <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                  <span className="text-[11px] font-medium text-content-muted uppercase">Examinations</span>
                  <p className="text-xl font-bold text-content-primary mt-0.5">
                    {samplePreview?.exam_count ?? 15}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                  <span className="text-[11px] font-medium text-content-muted uppercase">Students</span>
                  <p className="text-xl font-bold text-content-primary mt-0.5">
                    {samplePreview?.student_count ?? 36}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                  <span className="text-[11px] font-medium text-content-muted uppercase">Enrolments</span>
                  <p className="text-xl font-bold text-accent-primary mt-0.5">
                    {samplePreview?.enrolment_count ?? 85}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                  <span className="text-[11px] font-medium text-content-muted uppercase">Projected Conflicts</span>
                  <p className="text-xl font-bold text-accent-amber mt-0.5">
                    {samplePreview?.projected_conflicts ?? "35+"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-medium text-content-muted uppercase">Isolated Courses</span>
                  <p className="text-xl font-bold text-accent-emerald mt-0.5">
                    {samplePreview?.projected_isolated_exams.join(", ") || "ENG101"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sample Result Banner */}
          {sampleLoadResult && (
            <div className="p-5 rounded-xl bg-accent-emerald/10 border border-accent-emerald/30 text-content-primary space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} weight="bold" className="text-accent-emerald" />
                <h3 className="text-sm font-bold text-accent-emerald">Sample Dataset Loaded Successfully</h3>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed">
                {sampleLoadResult.message}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Link to="/app/conflict-graph">
                  <Button variant="secondary" size="sm" leftIcon={<Graph size={14} />}>
                    Explore Graph Explorer
                  </Button>
                </Link>
                <Link to="/app/algorithms">
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                    Solve in Algorithm Lab
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {sampleLoadError && (
            <div className="p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs">
              {sampleLoadError}
            </div>
          )}

          {/* Conflict Hub & Cohort Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="outlined">
              <CardHeader className="py-3 px-4 border-b border-border-subtle">
                <h3 className="text-xs uppercase tracking-wider font-bold text-content-muted">
                  High-Conflict Hubs & Bottlenecks
                </h3>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-content-secondary">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-accent-amber font-bold">
                    CS101
                  </span>
                  <p>
                    Taken jointly by Computer Science and Physics majors. Direct conflict edge with MATH101, MATH201, CS201, PHYS101.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-accent-amber font-bold">
                    MATH101
                  </span>
                  <p>
                    Foundational calculus taken across 4 separate cohorts (CS, Engineering, Natural Sciences, Quantitative Finance).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-accent-emerald font-bold">
                    ENG101
                  </span>
                  <p>
                    Pedagogical isolated course with degree d(ENG101) = 0. Tests algorithm handling of disjoint graph components.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader className="py-3 px-4 border-b border-border-subtle">
                <h3 className="text-xs uppercase tracking-wider font-bold text-content-muted">
                  Dataset Cohort Composition
                </h3>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-surface-subtle">
                  <span className="font-medium text-content-primary">Computer Science Core</span>
                  <span className="text-content-muted">CS101, CS201, CS301, CS401</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-subtle">
                  <span className="font-medium text-content-primary">Engineering & Physics</span>
                  <span className="text-content-muted">PHYS101, PHYS201, CHEM101</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-subtle">
                  <span className="font-medium text-content-primary">Natural Sciences & Pre-Med</span>
                  <span className="text-content-muted">BIO101, BIO201, CHEM101</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-subtle">
                  <span className="font-medium text-content-primary">Economics & Quantitative Finance</span>
                  <span className="text-content-muted">ECON101, ECON201, MATH301</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loading Options & Execution Panel */}
          <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-4">
            <h3 className="text-sm font-bold text-content-primary">Load Benchmark into Database</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  sampleLoadMode === "append"
                    ? "bg-accent-primary/5 border-accent-primary"
                    : "bg-surface-subtle border-border-subtle hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="sampleMode"
                  value="append"
                  checked={sampleLoadMode === "append"}
                  onChange={() => setSampleLoadMode("append")}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold text-content-primary block">
                    Append to Existing Records (Safe)
                  </span>
                  <p className="text-[11px] text-content-secondary mt-1 leading-relaxed">
                    Safely adds any missing sample exams and enrolments. Does not delete any existing university courses or students.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  sampleLoadMode === "replace"
                    ? "bg-accent-amber/5 border-accent-amber"
                    : "bg-surface-subtle border-border-subtle hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="sampleMode"
                  value="replace"
                  checked={sampleLoadMode === "replace"}
                  onChange={() => setSampleLoadMode("replace")}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold text-content-primary block">
                    Replace All Courses (Clean Slate)
                  </span>
                  <p className="text-[11px] text-content-secondary mt-1 leading-relaxed">
                    Clears courses, students, and enrolments, then loads the fresh 15-course benchmark. (Saved timetable schedules are preserved!).
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                variant={sampleLoadMode === "replace" ? "destructive" : "primary"}
                size="md"
                onClick={() => {
                  if (sampleLoadMode === "replace") {
                    setShowReplaceModal(true);
                  } else {
                    executeSampleLoad("append");
                  }
                }}
                isLoading={sampleLoading}
                leftIcon={<ArrowsClockwise size={16} />}
              >
                {sampleLoadMode === "replace" ? "Replace With Sample Dataset" : "Append Sample Dataset"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEMPLATES & SPECIFICATIONS                                         */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Examinations Template */}
            <Card variant="outlined" className="flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-accent-amber/10 text-accent-amber flex items-center justify-center">
                    <GraduationCap size={18} weight="bold" />
                  </div>
                  <Badge variant="muted" size="sm">
                    exams.csv
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-content-primary mt-3">
                  Examinations Schema
                </h3>
                <p className="text-xs text-content-secondary mt-1">
                  Defines course codes, subjects, and exam durations.
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="text-xs space-y-2">
                  <div className="p-2 rounded bg-surface-subtle border border-border-subtle font-mono text-[11px]">
                    <span className="text-accent-primary font-bold">exam_code</span> (Required, Unique string)
                    <br />
                    <span className="text-accent-primary font-bold">subject_name</span> (Required, Non-empty)
                    <br />
                    <span className="text-content-muted">department</span> (Optional)
                    <br />
                    <span className="text-content-muted">semester</span> (Optional)
                    <br />
                    <span className="text-content-muted">duration</span> (Optional, integer &gt; 0)
                  </div>
                </div>

                <a
                  href={apiClient.imports.getTemplateUrl("exams")}
                  download
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-surface-subtle border border-border-subtle hover:bg-surface text-content-primary shadow-xs transition-colors"
                >
                  <DownloadSimple size={14} />
                  Download exams_template.csv
                </a>
              </CardContent>
            </Card>

            {/* Students Template */}
            <Card variant="outlined" className="flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                    <Student size={18} weight="bold" />
                  </div>
                  <Badge variant="muted" size="sm">
                    students.csv
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-content-primary mt-3">
                  Students Schema
                </h3>
                <p className="text-xs text-content-secondary mt-1">
                  Unique student enrollment identification numbers.
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="text-xs space-y-2">
                  <div className="p-2 rounded bg-surface-subtle border border-border-subtle font-mono text-[11px]">
                    <span className="text-accent-primary font-bold">student_id</span> (Required, Unique identifier)
                    <br />
                    <span className="text-content-muted">student_name</span> (Optional, Student full name)
                  </div>
                </div>

                <a
                  href={apiClient.imports.getTemplateUrl("students")}
                  download
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-surface-subtle border border-border-subtle hover:bg-surface text-content-primary shadow-xs transition-colors"
                >
                  <DownloadSimple size={14} />
                  Download students_template.csv
                </a>
              </CardContent>
            </Card>

            {/* Enrolments Template */}
            <Card variant="outlined" className="flex flex-col justify-between">
              <CardHeader className="p-5 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-accent-emerald/10 text-accent-emerald flex items-center justify-center">
                    <Graph size={18} weight="bold" />
                  </div>
                  <Badge variant="muted" size="sm">
                    enrolments.csv
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-content-primary mt-3">
                  Enrolments Schema
                </h3>
                <p className="text-xs text-content-secondary mt-1">
                  Connects students to courses, generating the conflict graph.
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="text-xs space-y-2">
                  <div className="p-2 rounded bg-surface-subtle border border-border-subtle font-mono text-[11px]">
                    <span className="text-accent-primary font-bold">student_id</span> (Must exist in database)
                    <br />
                    <span className="text-accent-primary font-bold">exam_code</span> (Must exist in database)
                  </div>
                </div>

                <a
                  href={apiClient.imports.getTemplateUrl("enrolments")}
                  download
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-surface-subtle border border-border-subtle hover:bg-surface text-content-primary shadow-xs transition-colors"
                >
                  <DownloadSimple size={14} />
                  Download enrolments_template.csv
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Replace Mode */}
      <Dialog
        isOpen={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title="Confirm Clean Slate Sample Load"
        description="This action will clear existing course, student, and enrolment records and replace them with the 15-course benchmark. Previously saved timetable schedules are preserved."
      >
        <div className="p-4 bg-accent-amber/10 border border-accent-amber/30 rounded-lg text-xs text-content-secondary space-y-2">
          <p className="font-semibold text-accent-amber flex items-center gap-1.5">
            <Warning size={16} weight="fill" />
            Warning: Overwrite Existing Courses & Enrolments
          </p>
          <p>
            Any manually entered examinations or student lists will be permanently replaced with the benchmark records.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 mt-5">
          <Button variant="ghost" size="sm" onClick={() => setShowReplaceModal(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => executeSampleLoad("replace")}
            isLoading={sampleLoading}
          >
            Confirm & Replace All Data
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
