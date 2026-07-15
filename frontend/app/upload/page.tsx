"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/Toast";
import { manuscriptsApi, ApiError } from "../../lib/api";
import { formatBytes } from "../../lib/utils";
import { Upload, File, Sparkles, X, Loader2, GitBranch, FilePlus } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate modal state
  const [duplicateModal, setDuplicateModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const validateAndSetFile = (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      toast("Unsupported file type. Please upload a PDF or DOCX file.", "error");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast("File size exceeds 50MB limit.", "error");
      return;
    }
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildFormData = (uploadMode?: string): FormData => {
    const formData = new FormData();
    formData.append("file", file!);
    formData.append("title", title);
    if (author) formData.append("author", author);
    formData.append("auto_process", String(autoProcess));
    if (uploadMode) formData.append("upload_mode", uploadMode);
    return formData;
  };

  const submitUpload = async (uploadMode?: string) => {
    if (!token) return;
    setSubmitting(true);
    const formData = buildFormData(uploadMode);
    try {
      const result = await manuscriptsApi.upload(formData, token);
      toast(
        uploadMode === "version"
          ? `Version ${(result as { version_number?: number }).version_number ?? ""} uploaded successfully!`
          : "Manuscript uploaded successfully!",
        "success"
      );
      router.push(`/manuscripts/${(result as { id: string }).id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Duplicate detected — show modal
        setPendingFormData(formData);
        setDuplicateModal(true);
      } else if (err instanceof ApiError) {
        toast(err.detail, "error");
      } else {
        toast("Failed to upload manuscript.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast("Please select a file to upload", "warning"); return; }
    if (!title.trim()) { toast("Please specify a manuscript title", "warning"); return; }
    await submitUpload();
  };

  const handleDuplicateChoice = async (mode: "version" | "new") => {
    setDuplicateModal(false);
    await submitUpload(mode);
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto w-full space-y-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Upload Manuscript</h1>
          <p className="text-slate-400 text-sm">
            Import your document to analyse and coordinate AI reviews.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? "border-indigo-500 bg-indigo-500/5"
                : file
                ? "border-slate-700 bg-slate-900/10"
                : "border-slate-800 bg-slate-900/5 hover:border-slate-700 hover:bg-slate-900/10"
            }`}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx"
              className="hidden"
            />

            {!file ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400 border border-slate-700">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-300">Click to upload or drag & drop</p>
                  <p className="text-xs text-slate-500">PDF or DOCX files up to 50MB</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl max-w-md mx-auto">
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Manuscript Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Author Name (Optional)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author's name"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* AI review toggle */}
          <div className="flex items-start gap-3 p-4 bg-indigo-950/5 border border-indigo-950/20 rounded-xl">
            <input
              type="checkbox"
              id="autoProcess"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950/60"
            />
            <div className="space-y-1">
              <label htmlFor="autoProcess" className="text-sm font-semibold text-slate-300 cursor-pointer">
                Automatically run AI Review
              </label>
              <p className="text-xs text-slate-500 leading-normal">
                Kick off the multi-agent LangGraph workflow immediately. It extracts named entities and generates a full editorial report.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Upload Manuscript
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Duplicate Manuscript Modal */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Duplicate Title Detected</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                A manuscript titled <span className="font-semibold text-slate-200">&ldquo;{title}&rdquo;</span> already exists in your library.
                How would you like to proceed?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleDuplicateChoice("version")}
                disabled={submitting}
                className="w-full flex items-start gap-4 p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 rounded-xl transition-all text-left group disabled:opacity-50"
              >
                <div className="mt-0.5 p-2 bg-indigo-600/20 rounded-lg">
                  <GitBranch className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">Upload as New Version</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Link to the existing manuscript. Previous reports are preserved. A revision comparison will be generated automatically.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleDuplicateChoice("new")}
                disabled={submitting}
                className="w-full flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all text-left group disabled:opacity-50"
              >
                <div className="mt-0.5 p-2 bg-slate-700/50 rounded-lg">
                  <FilePlus className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">Upload as New Manuscript</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Treat this as a completely separate manuscript — no version linking.
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setDuplicateModal(false)}
              className="w-full text-xs text-slate-500 hover:text-slate-400 transition-colors pt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
