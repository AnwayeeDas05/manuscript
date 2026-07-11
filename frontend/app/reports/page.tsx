"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/Toast";
import { reportsApi, ApiError } from "../../lib/api";
import { EditorialReport } from "../../lib/types";
import { formatDate, getScoreColor } from "../../lib/utils";
import { FileText, Loader2, ArrowRight, Eye, Calendar, Award } from "lucide-react";

export default function ReportsListPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<EditorialReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      if (!token) return;
      try {
        const data = await reportsApi.list(token);
        setReports(data.reports);
      } catch (err) {
        if (err instanceof ApiError) {
          toast(err.detail, "error");
        } else {
          toast("Failed to load reports.", "error");
        }
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadReports();
    }
  }, [token]);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Editorial Reports</h1>
          <p className="text-slate-400 text-sm">
            Access compiled reviews and structural evaluations from completed AI reviewer sessions.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 border border-slate-850 bg-slate-900/10 rounded-2xl space-y-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-slate-350 font-semibold">No reports generated</h3>
              <p className="text-xs text-slate-500">Run an AI review session on an uploaded manuscript to get started.</p>
            </div>
            <Link
              href="/manuscripts"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all shadow-md shadow-indigo-600/15"
            >
              Go to Manuscripts
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700/60 transition-all duration-300 group"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <Link
                      href={`/manuscripts/${report.manuscript_id}`}
                      className="font-bold text-slate-200 hover:text-indigo-400 transition-colors block truncate text-base"
                    >
                      Editorial Report — {report.id.substring(0, 8)}...
                    </Link>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 pl-11">
                    {report.executive_summary || "No executive summary provided."}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 pl-11">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      {formatDate(report.created_at)}
                    </span>
                    <span>•</span>
                    <span className="text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                      {report.major_findings_count} Major Issues
                    </span>
                    <span className="text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-400/10">
                      {report.minor_findings_count} Minor Issues
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-11 md:pl-0 shrink-0">
                  {report.overall_score !== undefined && (
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span className={`text-2xl font-black ${getScoreColor(report.overall_score)}`}>
                          {report.overall_score}
                        </span>
                        <span className="text-slate-600 text-xs">/10</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Overall</p>
                    </div>
                  )}

                  <Link
                    href={`/manuscripts/${report.manuscript_id}`}
                    className="p-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/10 hover:border-indigo-500/25 transition-all"
                    title="View Report Details"
                  >
                    <ArrowRight className="w-4.5 h-4.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
