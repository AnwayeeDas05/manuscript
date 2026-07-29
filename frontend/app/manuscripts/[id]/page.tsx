"use client";

import React, { useEffect, useState, use } from "react";

// Expandable 2-line summary — click "Read more" to see the full text
function ExpandableSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  return (
    <div>
      <p className={`text-[10px] text-slate-400 leading-normal ${expanded ? "" : "line-clamp-2"}`}>
        {text}
      </p>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-0.5 transition-colors"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/Toast";
import { manuscriptsApi, reportsApi, ApiError } from "../../../lib/api";
import {
  Manuscript,
  EditorialReport,
  FullReport,
  Finding,
  RevisionSummary,
} from "../../../lib/types";
import {
  formatBytes,
  formatDate,
  getScoreColor,
  getScoreLabel,
  getStatusColor,
  getSeverityColor,
} from "../../../lib/utils";
import {
  BookOpen,
  FileText,
  Play,
  Loader2,
  Calendar,
  AlertTriangle,
  Download,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  User,
  GitBranch,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  XCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  Pencil,
} from "lucide-react";

export default function ManuscriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: manuscriptId } = use(params);
  const { token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [report, setReport] = useState<EditorialReport | null>(null);
  const [parsedReport, setParsedReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingState, setProcessingState] = useState<string>("idle");

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenEdit = () => {
    if (!manuscript) return;
    setEditTitle(manuscript.title);
    setEditAuthor(manuscript.author || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !manuscript) return;
    if (!editTitle.trim()) {
      toast("Title cannot be empty.", "error");
      return;
    }
    try {
      setIsUpdating(true);
      await manuscriptsApi.update(manuscript.id, { title: editTitle, author: editAuthor }, token);
      toast("Manuscript details updated successfully.", "success");
      setIsEditModalOpen(false);
      await loadManuscriptAndReport();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Failed to update details.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Version history
  const [versions, setVersions] = useState<Manuscript[]>([]);
  const [revisionSummary, setRevisionSummary] = useState<RevisionSummary | null>(null);

  // Findings filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const loadManuscriptAndReport = async () => {
    if (!token) return;
    try {
      const ms = await manuscriptsApi.get(manuscriptId, token);
      setManuscript(ms);

      // Load version history
      try {
        const vData = await manuscriptsApi.getVersions(manuscriptId, token);
        setVersions(vData.manuscripts);
      } catch { }

      if (ms.status === "completed") {
        try {
          const rep = await reportsApi.getByManuscript(manuscriptId, token);
          setReport(rep);
          if (rep.report_json) setParsedReport(JSON.parse(rep.report_json));
        } catch (repErr) {
          console.error("Report fetch error:", repErr);
        }

        // Load revision summary if this is version > 1
        if (ms.version_number > 1) {
          try {
            const rev = await manuscriptsApi.getRevisionSummary(manuscriptId, token);
            setRevisionSummary(rev);
          } catch { }
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.detail, "error");
      } else {
        toast("Failed to load manuscript details.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadManuscriptAndReport();
  }, [token]);

  // Polling for processing updates
  useEffect(() => {
    if (!token || !manuscript) return;
    if (manuscript.status !== "processing" && manuscript.status !== "uploaded") return;

    const interval = setInterval(async () => {
      try {
        const ms = await manuscriptsApi.get(manuscriptId, token);
        setManuscript(ms);
        if (ms.status === "completed") {
          clearInterval(interval);
          toast("Editorial report completed!", "success");
          loadManuscriptAndReport();
        } else if (ms.status === "failed") {
          clearInterval(interval);
          toast("Processing failed.", "error");
          loadManuscriptAndReport();
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [token, manuscript]);

  const handleStartProcess = async () => {
    if (!token) return;
    try {
      setProcessingState("starting");
      await manuscriptsApi.process(manuscriptId, token);
      toast("Review processing started.", "info");
      await loadManuscriptAndReport();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Failed to start review.", "error");
    } finally {
      setProcessingState("idle");
    }
  };

  const handleDownloadOriginal = async () => {
    if (!token || !manuscript) return;
    try {
      toast("Starting download...", "info");
      const response = await manuscriptsApi.downloadFile(manuscript.id, token);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = manuscript.original_filename || "manuscript";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast("Download started successfully", "success");
    } catch {
      toast("Failed to download file.", "error");
    }
  };

  const handleDownloadJson = async () => {
    if (!token || !report) return;
    try {
      const response = await reportsApi.downloadJson(report.id, token);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `editorial_report_${manuscriptId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast("Failed to download report.", "error");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!manuscript) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center space-y-4 max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Manuscript Not Found</h2>
          <p className="text-slate-400 text-sm">
            The requested manuscript could not be found or you do not have permission to view it.
          </p>
          <Link href="/manuscripts" className="text-indigo-400 hover:underline">Back to Manuscripts</Link>
        </div>
      </DashboardLayout>
    );
  }

  // Collect all findings for the filter panel
  const allFindings: (Finding & { category: string })[] = [
    ...(parsedReport?.character_analysis.findings.map(f => ({ ...f, category: "Character" })) || []),
    ...(parsedReport?.plot_analysis.findings.map(f => ({ ...f, category: "Plot" })) || []),
    ...(parsedReport?.timeline_analysis.findings.map(f => ({ ...f, category: "Timeline" })) || []),
    ...(parsedReport?.dialogue_analysis.findings.map(f => ({ ...f, category: "Dialogue" })) || []),
  ];

  const filteredFindings = allFindings.filter(f => {
    const catMatch = selectedCategory === "all" || f.category.toLowerCase() === selectedCategory.toLowerCase();
    const sevMatch = selectedSeverity === "all" || f.severity.toLowerCase() === selectedSeverity.toLowerCase();
    return catMatch && sevMatch;
  });

  // Severity counts
  const countBySeverity = (sev: string) => allFindings.filter(f => f.severity === sev).length;
  const criticalCount = parsedReport ? (parsedReport.critical_findings?.length ?? countBySeverity("critical")) : 0;
  const majorCount = parsedReport ? (parsedReport.major_findings?.length ?? countBySeverity("major")) : 0;
  const moderateCount = parsedReport ? (parsedReport.moderate_findings?.length ?? countBySeverity("moderate")) : 0;
  const minorCount = parsedReport ? (parsedReport.minor_findings?.length ?? countBySeverity("minor")) : 0;
  const suggCount = parsedReport ? (parsedReport.suggestions?.length ?? countBySeverity("suggestion")) : 0;

  const scoreChangeBadge = revisionSummary ? (
    revisionSummary.score_change > 0 ? (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-bold">
        <ArrowUpRight className="w-4 h-4" /> +{(revisionSummary.score_change / 10).toFixed(1)} pts
      </span>
    ) : revisionSummary.score_change < 0 ? (
      <span className="inline-flex items-center gap-1 text-rose-400 text-sm font-bold">
        <ArrowDownRight className="w-4 h-4" /> {(revisionSummary.score_change / 10).toFixed(1)} pts
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-slate-400 text-sm font-bold">
        <Minus className="w-4 h-4" /> No change
      </span>
    )
  ) : null;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/manuscripts" className="hover:text-slate-350 transition-colors">Manuscripts</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-400 truncate">{manuscript.title}</span>
          {manuscript.version_number > 1 && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-semibold">
              v{manuscript.version_number}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_260px] gap-8 items-start">
          {/* ── Main Content ─────────────────────────────────────────────── */}
          <div className="space-y-8 min-w-0">
            {/* Header Box */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-100 truncate">{manuscript.title}</h1>
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600 transition-colors flex-shrink-0"
                    title="Edit Title/Author"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {manuscript.author || "Unknown Author"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Uploaded {formatDate(manuscript.created_at)}
                  </span>
                  <span>•</span>
                  <span>{formatBytes(manuscript.file_size_bytes)}</span>
                  {manuscript.word_count && (
                    <><span>•</span><span>{manuscript.word_count.toLocaleString()} words</span></>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider ${getStatusColor(manuscript.status)}`}>
                  {manuscript.status}
                </span>
                <button
                  onClick={handleDownloadOriginal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-xl transition-all"
                >
                  <Download className="w-4 h-4" />Original File
                </button>
                {manuscript.status === "completed" && report && (
                  <button
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" />JSON Report
                  </button>
                )}
              </div>
            </div>

            {/* Status / Processing Board */}
            {manuscript.status !== "completed" && (
              <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
                <div className="text-center max-w-md mx-auto space-y-3">
                  {manuscript.status === "processing" ? (
                    <>
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                      <h3 className="text-lg font-bold">AI Review Running</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Parsing chapters, running spaCy NER, executing specialist reviewer agents…
                      </p>
                    </>
                  ) : manuscript.status === "failed" ? (
                    <>
                      <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                      <h3 className="text-lg font-bold text-rose-400">Processing Failed</h3>
                      <p className="text-sm text-slate-400">{manuscript.error_message || "An error occurred."}</p>
                      <button
                        onClick={handleStartProcess}
                        disabled={processingState === "starting"}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" /> Retry Analysis
                      </button>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-12 h-12 text-indigo-400 mx-auto" />
                      <h3 className="text-lg font-bold">Manuscript Registered</h3>
                      <p className="text-sm text-slate-400">This manuscript is uploaded but has not been reviewed yet.</p>
                      <button
                        onClick={handleStartProcess}
                        disabled={processingState === "starting"}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" /> Run AI Review Workflow
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Editorial Report */}
            {manuscript.status === "completed" && parsedReport && (
              <div className="space-y-8 animate-fade-in">
                {/* Score Summary */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-center items-center text-center space-y-4 hover-lift">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-5xl font-black ${getScoreColor(parsedReport.overall_score / 10)}`}>
                        {(parsedReport.overall_score / 10).toFixed(1)}
                      </span>
                      <span className="text-slate-600 font-medium text-lg">/10</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-slate-200">{getScoreLabel(parsedReport.overall_score / 10)}</p>
                      <p className="text-xs text-slate-500">Lower score = more severe issues</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-3 flex flex-col justify-between hover-lift">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Executive Summary</span>
                      <p className="text-sm text-slate-300 leading-relaxed">{parsedReport.executive_summary}</p>
                    </div>
                    {/* 4-Severity Counts */}
                    <div className="flex flex-wrap gap-3 border-t border-slate-800/60 pt-4 text-xs">
                      {[
                        { label: "Critical", count: criticalCount, color: "text-red-400" },
                        { label: "Major", count: majorCount, color: "text-rose-400" },
                        { label: "Moderate", count: moderateCount, color: "text-orange-400" },
                        { label: "Minor", count: minorCount, color: "text-amber-400" },
                      ].map(({ label, count, color }) => (
                        <span key={label} className="flex items-center gap-1.5 text-slate-400">
                          <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
                          <span className={`font-bold ${color}`}>{count}</span> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Per-Agent Scores */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 animate-cascade">
                  {[
                    { name: "Character", data: parsedReport.character_analysis },
                    { name: "Plot", data: parsedReport.plot_analysis },
                    { name: "Timeline", data: parsedReport.timeline_analysis },
                    { name: "Dialogue", data: parsedReport.dialogue_analysis },
                  ].map((agent) => (
                    <div key={agent.name} className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl space-y-2 hover-lift">
                      <span className="text-xs font-medium text-slate-500">{agent.name}</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold ${getScoreColor(agent.data.score)}`}>{agent.data.score}</span>
                        <span className="text-slate-600 text-xs">/10</span>
                      </div>
                      <ExpandableSummary text={agent.data.summary} />
                    </div>
                  ))}
                </div>

                {/* Revision Comparison (v2+) */}
                {revisionSummary && (
                  <div className="bg-slate-900/30 border border-slate-700/60 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-bold text-slate-200">
                          Revision Summary — v{revisionSummary.from_version} → v{revisionSummary.to_version}
                        </h3>
                      </div>
                      {scoreChangeBadge}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{revisionSummary.summary}</p>

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Fixed */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fixed ({revisionSummary.issues_fixed.length})
                        </div>
                        {revisionSummary.issues_fixed.length === 0 ? (
                          <p className="text-xs text-slate-600 italic">None</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {revisionSummary.issues_fixed.map((issue, i) => (
                              <li key={i} className="text-xs text-slate-300 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                                ✓ {issue.title}
                                {issue.severity && <span className="ml-1 text-slate-500">({issue.severity})</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Still Present */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5" /> Still Present ({revisionSummary.issues_still_present.length})
                        </div>
                        {revisionSummary.issues_still_present.length === 0 ? (
                          <p className="text-xs text-slate-600 italic">None</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {revisionSummary.issues_still_present.map((issue, i) => (
                              <li key={i} className="text-xs text-slate-300 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                                ⚠ {issue.title}
                                {issue.severity && <span className="ml-1 text-slate-500">({issue.severity})</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* New Issues */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" /> New Issues ({revisionSummary.new_issues.length})
                        </div>
                        {revisionSummary.new_issues.length === 0 ? (
                          <p className="text-xs text-slate-600 italic">None</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {revisionSummary.new_issues.map((issue, i) => (
                              <li key={i} className="text-xs text-slate-300 bg-rose-500/5 border border-rose-500/15 rounded-lg px-3 py-2">
                                ✗ {issue.title}
                                {issue.severity && <span className="ml-1 text-slate-500">({issue.severity})</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {parsedReport.recommendations && parsedReport.recommendations.length > 0 && (
                  <div className="bg-indigo-950/5 border border-indigo-950/20 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-sm text-slate-200">Chief Editor Action Recommendations</h3>
                    </div>
                    <ul className="grid sm:grid-cols-3 gap-4">
                      {parsedReport.recommendations.map((rec, index) => (
                        <li key={index} className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/40 text-xs text-slate-350 leading-relaxed relative pl-8">
                          <span className="absolute left-3 top-4 text-indigo-400 font-bold text-xs">{index + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Findings Filter Bar */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <h2 className="text-lg font-bold text-slate-200">Detailed Editorial Findings ({filteredFindings.length})</h2>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 outline-none"
                      >
                        <option value="all">All Sections</option>
                        <option value="character">Character</option>
                        <option value="plot">Plot</option>
                        <option value="timeline">Timeline</option>
                        <option value="dialogue">Dialogue</option>
                      </select>
                      <select
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                        className="px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 outline-none"
                      >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="major">Major</option>
                        <option value="moderate">Moderate</option>
                        <option value="minor">Minor</option>
                      </select>
                    </div>
                  </div>

                  {filteredFindings.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 border border-slate-850 bg-slate-900/5 rounded-2xl">
                      No findings match selected filters.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredFindings.map((finding) => (
                        <div
                          key={finding.id}
                          className="bg-slate-900/25 border border-slate-800/60 hover:border-slate-800 rounded-xl p-5 space-y-4 transition-colors"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getSeverityColor(finding.severity)}`}>
                                {finding.severity}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500">
                                Category: {finding.category}
                              </span>
                            </div>
                            {finding.chapter && (
                              <span className="text-xs text-slate-500">Chapter {finding.chapter}</span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-bold text-sm text-slate-200">{finding.title}</h4>
                            <p className="text-xs text-slate-450 leading-relaxed">{finding.description}</p>
                          </div>

                          {finding.evidence && (
                            <div className="p-3 bg-slate-950/60 border-l-2 border-slate-800 rounded-r-lg text-xs italic text-slate-400 leading-normal">
                              &ldquo;{finding.evidence}&rdquo;
                            </div>
                          )}

                          <div className="text-xs text-slate-400 bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10 space-y-1">
                            <span className="font-semibold text-indigo-400">Action Fix Recommendation:</span>
                            <p className="leading-relaxed">{finding.recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Version History Sidebar ──────────────────────────────────── */}
          {versions.length > 0 && (
            <aside className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 space-y-4 lg:sticky lg:top-6">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-200">Revision History</h3>
                <span className="ml-auto text-xs text-slate-500">{versions.length} version{versions.length !== 1 ? "s" : ""}</span>
              </div>
              <ul className="space-y-2">
                {versions.map((v) => {
                  const isCurrent = v.id === manuscriptId;
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => router.push(`/manuscripts/${v.id}`)}
                        className={`w-full text-left px-3 py-3 rounded-xl border transition-all space-y-1 ${isCurrent
                            ? "bg-indigo-600/15 border-indigo-500/30 cursor-default"
                            : "border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/30"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${isCurrent ? "text-indigo-400" : "text-slate-300"}`}>
                            Version {v.version_number}
                            {isCurrent && <span className="ml-2 text-[9px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded-full">current</span>}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${getStatusColor(v.status)}`}>
                            {v.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">{formatDate(v.created_at)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-100">Edit Details</h3>
            <p className="text-xs text-slate-500">
              Updating these details will apply to all versions of this manuscript.
            </p>
            <form onSubmit={handleUpdateMetadata} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Manuscript Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Author Name</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 outline-none transition-all"
                  placeholder="Unknown Author"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
