"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/Toast";
import { reportsApi, manuscriptsApi, ApiError } from "../../lib/api";
import { EditorialReport, Manuscript } from "../../lib/types";
import { formatDate, getScoreColor } from "../../lib/utils";
import {
  FileText,
  Loader2,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  GitBranch,
} from "lucide-react";

export default function ReportsListPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<EditorialReport[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const [rData, mData] = await Promise.all([
          reportsApi.list(token),
          manuscriptsApi.list(token),
        ]);
        setReports(rData.reports);
        setManuscripts(mData.manuscripts);
      } catch (err) {
        toast(err instanceof ApiError ? err.detail : "Failed to load reports.", "error");
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  // Build a map from manuscript_id → manuscript for quick lookup
  const msMap = useMemo(() => {
    const m = new Map<string, Manuscript>();
    manuscripts.forEach((ms) => m.set(ms.id, ms));
    return m;
  }, [manuscripts]);

  // Group reports by normalized manuscript title — same title = same group
  const groups = useMemo(() => {
    const groupMap = new Map<string, { title: string; items: { report: EditorialReport; ms: Manuscript | undefined }[] }>();

    reports.forEach((r) => {
      const ms = msMap.get(r.manuscript_id);
      // If ms has a parent, look up parent's title; otherwise use ms title
      const parentMs = ms?.parent_id ? msMap.get(ms.parent_id) : undefined;
      const rawTitle = parentMs?.title ?? ms?.title ?? "Unknown Manuscript";
      const key = rawTitle.toLowerCase().trim().replace(/\s+/g, " ");

      if (!groupMap.has(key)) {
        groupMap.set(key, { title: rawTitle, items: [] });
      }
      groupMap.get(key)!.items.push({ report: r, ms });
    });

    // Sort items within each group by version ascending
    groupMap.forEach((g) => {
      g.items.sort((a, b) => (a.ms?.version_number ?? 1) - (b.ms?.version_number ?? 1));
    });

    const q = search.toLowerCase();
    return Array.from(groupMap.entries())
      .filter(([, g]) => g.title.toLowerCase().includes(q))
      .map(([key, g]) => ({ rootId: key, ...g }));
  }, [reports, msMap, search]);


  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Editorial Reports</h1>
          <p className="text-slate-400 text-sm">
            Click a title to see reports for each version of that manuscript.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by manuscript title..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 border border-slate-800 bg-slate-900/10 rounded-2xl space-y-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-slate-350 font-semibold">No reports found</h3>
              <p className="text-xs text-slate-500">Run an AI review on a manuscript to generate a report.</p>
            </div>
            <Link
              href="/manuscripts"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all shadow-md shadow-indigo-600/15"
            >
              Go to Manuscripts
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-cascade">
            {groups.map(({ rootId, title, items }) => {
              const isExpanded = expandedGroups.has(rootId);
              const hasMultiple = items.length > 1;
              const bestScore = Math.max(...items.map((i) => i.report.overall_score ?? 0));

              const getAccentClass = (score: number) => {
                const s = score / 10;
                if (s >= 8) return "border-l-emerald-500";
                if (s >= 6) return "border-l-yellow-500";
                if (s >= 4) return "border-l-orange-500";
                return "border-l-red-500";
              };

              return (
                <div key={rootId} className={`border border-slate-800/80 border-l-4 ${getAccentClass(bestScore)} rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/30 to-slate-950/20 hover-lift`}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(rootId)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-slate-800/10 transition-colors text-left group"
                  >
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />

                    <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                        {title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {items.length} {items.length === 1 ? "report" : "reports"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {hasMultiple && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          <GitBranch className="w-3 h-3" />
                          {items.length} versions
                        </span>
                      )}
                      {bestScore > 0 && (
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black ${getScoreColor(bestScore / 10)}`}>
                            {(bestScore / 10).toFixed(1)}
                          </span>
                          <span className="text-slate-600 text-[10px]">/10</span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Per-version rows */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/60 divide-y divide-slate-800/40">
                      {items.map(({ report, ms }) => (
                        <div
                          key={report.id}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/20 transition-colors"
                        >
                          {/* Version badge */}
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded shrink-0">
                            v{ms?.version_number ?? "?"}
                          </span>

                          {/* Summary + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                              {report.executive_summary || "No summary available."}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(report.created_at).split(",")[0]}
                              </span>
                              {report.critical_findings_count && Number(report.critical_findings_count) > 0 && (
                                <span className="text-red-400 bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                                  {report.critical_findings_count} Critical
                                </span>
                              )}
                              {report.major_findings_count && (
                                <span className="text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">
                                  {report.major_findings_count} Major
                                </span>
                              )}
                              {report.minor_findings_count && (
                                <span className="text-amber-400 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-400/10">
                                  {report.minor_findings_count} Minor
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score */}
                          {report.overall_score !== undefined && (
                            <div className="text-right shrink-0">
                              <div className="flex items-baseline justify-end gap-0.5">
                                <span className={`text-xl font-black ${getScoreColor(report.overall_score / 10)}`}>
                                  {(report.overall_score / 10).toFixed(1)}
                                </span>
                                <span className="text-slate-600 text-[10px]">/10</span>
                              </div>
                            </div>
                          )}

                          {/* Link */}
                          <Link
                            href={`/manuscripts/${report.manuscript_id}`}
                            className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/10 hover:border-indigo-500/25 transition-all shrink-0"
                            title="View Report"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
