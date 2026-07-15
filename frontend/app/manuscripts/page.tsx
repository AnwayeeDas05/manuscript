"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/Toast";
import { manuscriptsApi, ApiError } from "../../lib/api";
import { Manuscript } from "../../lib/types";
import { formatBytes, formatDate, getStatusColor } from "../../lib/utils";
import {
  BookOpen,
  FileText,
  Trash2,
  Play,
  Search,
  Upload,
  Loader2,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Download,
} from "lucide-react";

export default function ManuscriptsPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadManuscripts = async () => {
    if (!token) return;
    try {
      const data = await manuscriptsApi.list(token);
      setManuscripts(data.manuscripts);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Failed to load manuscripts.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadManuscripts();
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this manuscript and all its outputs?")) return;
    if (!token) return;
    try {
      await manuscriptsApi.delete(id, token);
      toast("Manuscript deleted successfully", "success");
      setManuscripts((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Failed to delete manuscript.", "error");
    }
  };

  const handleProcess = async (id: string) => {
    if (!token) return;
    try {
      toast("Processing initiated in background...", "info");
      await manuscriptsApi.process(id, token);
      await loadManuscripts();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Failed to start processing.", "error");
    }
  };

  const handleDownloadOriginal = async (id: string, originalFilename: string) => {
    if (!token) return;
    try {
      toast("Starting download...", "info");
      const response = await manuscriptsApi.downloadFile(id, token);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalFilename || "manuscript";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast("Download started successfully", "success");
    } catch {
      toast("Failed to download file.", "error");
    }
  };


  // Group manuscripts by normalized title — same title = same group
  const groups = useMemo(() => {
    const groupMap = new Map<string, { title: string; versions: Manuscript[] }>();

    manuscripts.forEach((m) => {
      // Normalize: lowercase, trim, collapse whitespace
      const key = m.title.toLowerCase().trim().replace(/\s+/g, " ");
      if (!groupMap.has(key)) {
        groupMap.set(key, { title: m.title, versions: [] });
      }
      groupMap.get(key)!.versions.push(m);
    });

    // Within each group, sort by version_number then created_at
    groupMap.forEach((g) => {
      g.versions.sort((a, b) =>
        a.version_number !== b.version_number
          ? a.version_number - b.version_number
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const q = search.toLowerCase();
    return Array.from(groupMap.values()).filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.versions.some((m) => (m.author ?? "").toLowerCase().includes(q))
    );
  }, [manuscripts, search]);


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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manuscripts</h1>
            <p className="text-slate-400 text-sm">
              Click a title to expand all versions. Upload a new version from the manuscript detail page.
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-center"
          >
            <Upload className="w-4 h-4" />
            Upload Manuscript
          </Link>
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
            placeholder="Search by title or author..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 border border-slate-800/80 bg-slate-900/10 rounded-2xl space-y-4">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-slate-350 font-semibold">No manuscripts found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search or upload a new file.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(({ title, versions }) => {
              const groupKey = title.toLowerCase().trim().replace(/\s+/g, " ");
              const isExpanded = expandedGroups.has(groupKey);
              const hasMultiple = versions.length > 1;
              const latestStatus = versions[versions.length - 1].status;
              const first = versions[0];

              return (
                <div key={groupKey} className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/20">
                  {/* Group Header — click to expand */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-slate-800/30 transition-colors text-left group"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}

                    <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                        {title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        By {first.author || "Unknown"} · {formatDate(first.created_at).split(",")[0]}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {hasMultiple && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          <GitBranch className="w-3 h-3" />
                          {versions.length} versions
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${getStatusColor(latestStatus)}`}
                      >
                        {latestStatus}
                      </span>
                    </div>
                  </button>

                  {/* Versions — shown when expanded */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/60 divide-y divide-slate-800/40">
                      {versions.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/20 transition-colors"
                        >
                          {/* Version Badge */}
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded shrink-0">
                            v{m.version_number}
                          </span>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(m.created_at).split(",")[0]}
                              </span>
                              <span>{formatBytes(m.file_size_bytes)}</span>
                              {m.word_count && <span>{m.word_count.toLocaleString()} words</span>}
                              {m.chapter_count && <span>{m.chapter_count} ch.</span>}
                            </div>
                            {m.status === "failed" && m.error_message && (
                              <div className="mt-1.5 flex items-start gap-1.5 text-rose-400">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <p className="text-[10px] leading-relaxed line-clamp-1">{m.error_message}</p>
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider shrink-0 ${getStatusColor(m.status)}`}
                          >
                            {m.status}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {m.status === "completed" ? (
                              <Link
                                href={`/manuscripts/${m.id}`}
                                className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                View Report
                              </Link>
                            ) : m.status === "uploaded" || m.status === "failed" ? (
                              <button
                                onClick={() => handleProcess(m.id)}
                                className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Run
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 py-1.5 px-3 text-slate-500 text-xs">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Processing
                              </div>
                            )}

                            <button
                              onClick={() => handleDownloadOriginal(m.id, m.original_filename)}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg border border-transparent hover:border-slate-700/50 transition-all"
                              title="Download Original Manuscript"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 rounded-lg border border-transparent hover:border-rose-500/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
