"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/Toast";
import { reportsApi, ApiError } from "../../../lib/api";
import { Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ReportRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndRedirect() {
      if (!token) return;
      try {
        const report = await reportsApi.get(reportId, token);
        if (report && report.manuscript_id) {
          router.replace(`/manuscripts/${report.manuscript_id}`);
        } else {
          setError("Report is missing manuscript association.");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError("Failed to load report info.");
        }
        toast("Could not locate associated manuscript.", "error");
      }
    }
    if (token) {
      fetchAndRedirect();
    }
  }, [token, reportId, router]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center space-y-4 max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Report Loading Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <Link href="/reports" className="text-indigo-400 hover:underline">
            Back to Reports
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex items-center justify-center min-h-[60vh] flex-col space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-500">Locating manuscript files...</p>
      </div>
    </DashboardLayout>
  );
}
