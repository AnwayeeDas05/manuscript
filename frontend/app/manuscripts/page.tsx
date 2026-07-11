"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/Toast";
import { manuscriptsApi, ApiError } from "../../lib/api";
import { Manuscript } from "../../lib/types";
import {
  formatBytes,
  formatDate,
  getStatusColor,
} from "../../lib/utils";
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
} from "lucide-react";

export default function ManuscriptsPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadManuscripts = async () => {
    if (!token) return;
    try {
      const data = await manuscriptsApi.list(token);
      setManuscripts(data.manuscripts);
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.detail, "error");
      } else {
        toast("Failed to load manuscripts.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadManuscripts();
    }
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this manuscript? This will delete all parsed chapters and report outputs.")) {
      return;
    }
    if (!token) return;

    try {
      await manuscriptsApi.delete(id, token);
      toast("Manuscript deleted successfully", "success");
      setManuscripts((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.detail, "error");
      } else {
        toast("Failed to delete manuscript.", "error");
      }
    }
  };

  const handleProcess = async (id: string) => {
    if (!token) return;
    try {
      toast("Processing initiated in background...", "info");
      await manuscriptsApi.process(id, token);
      await loadManuscripts(); // refresh list to show updated status
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.detail, "error");
      } else {
        toast("Failed to start processing.", "error");
      }
    }
  };

  const filteredManuscripts = manuscripts.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.author && m.author.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manuscripts</h1>
            <p className="text-slate-400 text-sm">
              Manage uploaded files, verify processing status, and view report history.
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/20 p-4 border border-slate-800/80 rounded-2xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or author..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-400 outline-none transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Manuscripts Grid / List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredManuscripts.length === 0 ? (
          <div className="text-center py-20 border border-slate-850 bg-slate-900/10 rounded-2xl space-y-4">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-slate-350 font-semibold">No manuscripts found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search or filters.</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManuscripts.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/60 transition-all duration-300 group"
              >
                <div className="space-y-4">
                  {/* Status & Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {m.file_type}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${getStatusColor(
                        m.status
                      )}`}
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Title & Author */}
                  <div className="space-y-1 min-w-0">
                    <Link
                      href={`/manuscripts/${m.id}`}
                      className="font-bold text-lg text-slate-200 group-hover:text-indigo-400 transition-colors block truncate"
                    >
                      {m.title}
                    </Link>
                    <p className="text-xs text-slate-400 font-medium">By {m.author || "Unknown"}</p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-2 border-t border-slate-800/60 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      <span>{formatDate(m.created_at).split(",")[0]}</span>
                    </div>
                    <div>{formatBytes(m.file_size_bytes)}</div>
                    <div>{m.word_count ? `${m.word_count.toLocaleString()} words` : "Unparsed"}</div>
                    <div>{m.chapter_count ? `${m.chapter_count} chapters` : "Unparsed"}</div>
                  </div>
                </div>

                {/* Error Banner if failed */}
                {m.status === "failed" && m.error_message && (
                  <div className="mt-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-start gap-2 text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed line-clamp-2">{m.error_message}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/60">
                  {m.status === "completed" ? (
                    <Link
                      href={`/manuscripts/${m.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Report
                    </Link>
                  ) : m.status === "uploaded" || m.status === "failed" ? (
                    <button
                      onClick={() => handleProcess(m.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Analysis
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-500 text-xs font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Reviewing...
                    </div>
                  )}

                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl border border-transparent hover:border-rose-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
