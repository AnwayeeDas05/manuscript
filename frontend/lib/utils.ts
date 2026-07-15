import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/** Works on 0–10 scale. Lower score = more severe issues = red. */
export function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

/** Works on 0–10 scale. Lower score = more severe issues. */
export function getScoreLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Very Good";
  if (score >= 7) return "Good";
  if (score >= 6) return "Above Average";
  if (score >= 5) return "Average";
  if (score >= 4) return "Below Average";
  if (score >= 2.5) return "Poor";
  return "Needs Major Revision";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "text-emerald-400 bg-emerald-400/10";
    case "processing": return "text-blue-400 bg-blue-400/10";
    case "uploaded": return "text-slate-400 bg-slate-400/10";
    case "failed": return "text-red-400 bg-red-400/10";
    default: return "text-slate-400 bg-slate-400/10";
  }
}

/** Return colour class for a finding severity badge. */
export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":   return "text-red-400 bg-red-500/10 border border-red-500/25";
    case "major":      return "text-rose-400 bg-rose-500/10 border border-rose-500/20";
    case "moderate":   return "text-orange-400 bg-orange-500/10 border border-orange-500/20";
    case "minor":      return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
    case "suggestion": return "text-slate-400 bg-slate-800 border border-slate-700/50";
    default:           return "text-slate-400 bg-slate-800 border border-slate-700/50";
  }
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
