"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/Toast";
import { dashboardApi, ApiError } from "../../lib/api";
import { DashboardStats } from "../../lib/types";
import {
  formatBytes,
  formatRelativeTime,
  getStatusColor,
} from "../../lib/utils";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Upload,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { token, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!token) return;
      try {
        const data = await dashboardApi.stats(token);
        setStats(data);
      } catch (err) {
        if (err instanceof ApiError) {
          toast(err.detail, "error");
        } else {
          toast("Failed to load dashboard data.", "error");
        }
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadStats();
    }
  }, [token, toast]);

  if (authLoading || (loading && !stats)) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      name: "Total Manuscripts",
      value: stats?.total_manuscripts || 0,
      icon: BookOpen,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/10",
      gradient: "from-blue-950/20 to-slate-900/30",
      accent: "border-l-blue-500",
      trend: "",
      trendColor: "",
    },
    {
      name: "Successfully Reviewed",
      value: stats?.completed_manuscripts || 0,
      icon: CheckCircle2,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10",
      gradient: "from-emerald-950/20 to-slate-900/30",
      accent: "border-l-emerald-500",
      trend: "All completed",
      trendColor: "text-emerald-400",
    },
    {
      name: "Currently Processing",
      value: stats?.processing_manuscripts || 0,
      icon: Clock,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/10",
      gradient: "from-amber-950/20 to-slate-900/30",
      accent: "border-l-amber-500",
      trend: stats?.processing_manuscripts && stats.processing_manuscripts > 0 ? "In progress" : "Queue empty",
      trendColor: stats?.processing_manuscripts && stats.processing_manuscripts > 0 ? "text-amber-400" : "text-slate-500",
    },
    {
      name: "Total Editorial Reports",
      value: stats?.total_reports || 0,
      icon: FileText,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/10",
      gradient: "from-indigo-950/20 to-slate-900/30",
      accent: "border-l-indigo-500",
      trend: "",
      trendColor: "",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/20 via-slate-900/40 to-slate-950/20 border border-slate-800/80 p-8 rounded-2xl relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Hello, {user?.full_name || "Writer"}
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Welcome back to your manuscript dashboard. Here is your recent activity.
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start md:self-center"
          >
            <Upload className="w-4 h-4" />
            Upload Manuscript
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-cascade">
          {statCards.map((card) => (
            <div
              key={card.name}
              className={`p-5 rounded-2xl bg-gradient-to-br ${card.gradient} border border-slate-800/80 border-l-4 ${card.accent} flex items-center justify-between hover-lift`}
            >
              <div className="space-y-1.5 min-w-0">
                <span className="text-xs text-slate-500 font-medium truncate block">{card.name}</span>
                <p className="text-3xl font-bold text-slate-100">{card.value}</p>
                {card.trend && (
                  <span className={`text-[10px] font-semibold block ${card.trendColor}`}>
                    {card.trend}
                  </span>
                )}
              </div>
              <div className={`p-3 rounded-xl border ${card.color} shrink-0 ml-4`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Activity & Lists */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Manuscripts */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent Manuscripts</h2>
              <Link
                href="/manuscripts"
                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden">
              {stats?.recent_manuscripts.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">No manuscripts uploaded yet</p>
                  <Link
                    href="/upload"
                    className="text-xs text-indigo-400 hover:underline font-semibold"
                  >
                    Upload one now
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {stats?.recent_manuscripts.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/manuscripts/${m.id}`}
                          className="font-semibold text-slate-200 hover:text-indigo-400 transition-colors block text-sm"
                        >
                          {m.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{m.chapter_count || "?"} chapters</span>
                          <span>•</span>
                          <span>{m.word_count ? `${m.word_count.toLocaleString()} words` : "?"}</span>
                          <span>•</span>
                          <span>Uploaded {formatRelativeTime(m.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${getStatusColor(
                            m.status
                          )}`}
                        >
                          {m.status}
                        </span>
                        {m.status === "completed" && (
                          <Link
                            href={`/manuscripts/${m.id}`}
                            className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors"
                            title="View Report"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Recent Reports</h2>

            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden p-5 space-y-4">
              {stats?.recent_reports.length === 0 ? (
                <div className="text-center py-6 text-slate-500 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-700" />
                  <p className="text-xs">No reports generated yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.recent_reports.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/40 rounded-xl flex items-center justify-between hover-lift"
                    >
                      <div className="space-y-1 min-w-0">
                        <Link
                          href={`/manuscripts/${r.manuscript_id}`}
                          className="font-semibold text-sm text-slate-200 hover:text-indigo-400 transition-colors block truncate"
                        >
                          Report for Manuscript
                        </Link>
                        <p className="text-xs text-slate-500">
                          Score: {r.overall_score !== undefined ? `${(r.overall_score / 10).toFixed(1)}/10` : "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                          {r.major_findings_count} Major
                        </span>
                        <Link
                          href={`/manuscripts/${r.manuscript_id}`}
                          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
