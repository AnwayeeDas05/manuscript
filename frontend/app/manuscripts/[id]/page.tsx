"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/Toast";
import { manuscriptsApi, reportsApi, ApiError } from "../../../lib/api";
import { Manuscript, EditorialReport, FullReport, Finding } from "../../../lib/types";
import {
  formatBytes,
  formatDate,
  getScoreColor,
  getScoreLabel,
  getStatusColor,
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
  User,
  ExternalLink,
} from "lucide-react";

export default function ManuscriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: manuscriptId } = use(params);
  const { token } = useAuth();
  const { toast } = useToast();

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [report, setReport] = useState<EditorialReport | null>(null);
  const [parsedReport, setParsedReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingState, setProcessingState] = useState<string>("idle");

  // Filters for findings
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const loadManuscriptAndReport = async () => {
    if (!token) return;
    try {
      const ms = await manuscriptsApi.get(manuscriptId, token);
      setManuscript(ms);

      if (ms.status === "completed") {
        try {
          const rep = await reportsApi.getByManuscript(manuscriptId, token);
          setReport(rep);
          if (rep.report_json) {
            setParsedReport(JSON.parse(rep.report_json));
          }
        } catch (repErr) {
          console.error("Report fetch error:", repErr);
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
    if (token) {
      loadManuscriptAndReport();
    }
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
          toast("Processing failed. See error details.", "error");
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
      if (err instanceof ApiError) {
        toast(err.detail, "error");
      } else {
        toast("Failed to start review processing.", "error");
      }
    } finally {
      setProcessingState("idle");
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
    } catch (err) {
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
          <Link href="/manuscripts" className="text-indigo-400 hover:underline">
            Back to Manuscripts
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const allFindings = [
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

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/manuscripts" className="hover:text-slate-350 transition-colors">Manuscripts</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-400 truncate">{manuscript.title}</span>
        </div>

        {/* Header Box */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-100">{manuscript.title}</h1>
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
                <>
                  <span>•</span>
                  <span>{manuscript.word_count.toLocaleString()} words</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider ${getStatusColor(
                manuscript.status
              )}`}
            >
              {manuscript.status}
            </span>
            {manuscript.status === "completed" && report && (
              <button
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                JSON Report
              </button>
            )}
          </div>
        </div>

        {/* Status Processing Board */}
        {manuscript.status !== "completed" && (
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="text-center max-w-md mx-auto space-y-3">
              {manuscript.status === "processing" ? (
                <>
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                  <h3 className="text-lg font-bold">AI Review Running</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We are currently parsing chapters, running spaCy named entity extractors, and executing character, plot, timeline, and dialogue reviewer agents. This might take up to a minute.
                  </p>
                </>
              ) : manuscript.status === "failed" ? (
                <>
                  <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                  <h3 className="text-lg font-bold text-rose-400">Processing Failed</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {manuscript.error_message || "An error occurred during agent analysis."}
                  </p>
                  <button
                    onClick={handleStartProcess}
                    disabled={processingState === "starting"}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Retry Analysis
                  </button>
                </>
              ) : (
                <>
                  <BookOpen className="w-12 h-12 text-indigo-400 mx-auto" />
                  <h3 className="text-lg font-bold">Manuscript Registered</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    This manuscript is uploaded but has not been parsed or reviewed yet.
                  </p>
                  <button
                    onClick={handleStartProcess}
                    disabled={processingState === "starting"}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Run AI Review Workflow
                  </button>
                </>
              )}
            </div>

            {/* Workflow Pipeline Progress Indicator */}
            {manuscript.status === "processing" && (
              <div className="grid md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-6 border-t border-slate-800/60 text-center">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-350">1. Text Parsing</p>
                  <p className="text-[10px] text-slate-500">Extracting chapters</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-350">2. Named Entities</p>
                  <p className="text-[10px] text-slate-500">spaCy annotations</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-350">3. Specialist Reviewers</p>
                  <p className="text-[10px] text-slate-500">Character, Plot, Dialogue</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-350">4. Editorial Merge</p>
                  <p className="text-[10px] text-slate-500">Chief editor compilation</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editorial Report View */}
        {manuscript.status === "completed" && parsedReport && (
          <div className="space-y-8">
            {/* Top Score Summary Board */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Overall Score */}
              <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-center items-center text-center space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
                <div className="relative flex items-center justify-center">
                  {/* Circle score number badge */}
                  <span className={`text-5xl font-black ${getScoreColor(parsedReport.overall_score)}`}>
                    {parsedReport.overall_score}
                  </span>
                  <span className="text-slate-600 font-medium text-lg ml-0.5">/10</span>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-slate-200">{getScoreLabel(parsedReport.overall_score)}</p>
                  <p className="text-xs text-slate-500">Compiled from multi-agent evaluations</p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="md:col-span-2 bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Executive Summary</span>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {parsedReport.executive_summary}
                  </p>
                </div>
                <div className="flex gap-4 border-t border-slate-800/60 pt-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {parsedReport.major_findings.length} Major Problems
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {parsedReport.minor_findings.length} Minor Problems
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Reviewer Agents Ratings */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { name: "Character Review", data: parsedReport.character_analysis },
                { name: "Plot Structure", data: parsedReport.plot_analysis },
                { name: "Timeline review", data: parsedReport.timeline_analysis },
                { name: "Dialogue & Voice", data: parsedReport.dialogue_analysis },
              ].map((agent) => (
                <div key={agent.name} className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-medium text-slate-500">{agent.name}</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${getScoreColor(agent.data.score)}`}>{agent.data.score}</span>
                    <span className="text-slate-600 text-xs">/10</span>
                  </div>
                  <p className="text-[10px] text-slate-450 line-clamp-2 leading-normal">{agent.data.summary}</p>
                </div>
              ))}
            </div>

            {/* Recommendations Panel */}
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
                  {/* Category Filter */}
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

                  {/* Severity Filter */}
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 outline-none"
                  >
                    <option value="all">All Severities</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </div>
              </div>

              {/* Findings List */}
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
                      {/* Severity Header badge */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              finding.severity === "major"
                                ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                : finding.severity === "minor"
                                ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                                : "text-slate-400 bg-slate-800 border border-slate-700/50"
                            }`}
                          >
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

                      {/* Issue Description */}
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-slate-200">{finding.title}</h4>
                        <p className="text-xs text-slate-450 leading-relaxed">{finding.description}</p>
                      </div>

                      {/* Evidence exact quote */}
                      {finding.evidence && (
                        <div className="p-3 bg-slate-950/60 border-l-2 border-slate-800 rounded-r-lg text-xs italic text-slate-400 leading-normal">
                          "{finding.evidence}"
                        </div>
                      )}

                      {/* Recommendation fix */}
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
    </DashboardLayout>
  );
}
