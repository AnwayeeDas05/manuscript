export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export type ManuscriptStatus = "uploaded" | "processing" | "completed" | "failed";

export interface Manuscript {
  id: string;
  owner_id: string;
  title: string;
  author?: string;
  original_filename: string;
  file_size_bytes: number;
  file_type: string;
  status: ManuscriptStatus;
  word_count?: number;
  chapter_count?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  parent_id?: string | null;
  version_number: number;
}

export interface ManuscriptListResponse {
  manuscripts: Manuscript[];
  total: number;
}

export interface Finding {
  id: string;
  chapter?: number;
  category?: string;
  severity: "critical" | "major" | "moderate" | "minor" | "suggestion";
  title: string;
  description: string;
  evidence?: string;
  recommendation: string;
}

export interface AgentAnalysis {
  score: number;
  summary: string;
  findings: Finding[];
}

export interface FullReport {
  manuscript_id: string;
  title: string;
  executive_summary: string;
  overall_score: number; // 0-100
  character_analysis: AgentAnalysis;
  plot_analysis: AgentAnalysis;
  timeline_analysis: AgentAnalysis;
  dialogue_analysis: AgentAnalysis;
  critical_findings: Finding[];
  major_findings: Finding[];
  moderate_findings: Finding[];
  minor_findings: Finding[];
  suggestions: Finding[];
  recommendations: string[];
  overall_assessment: string;
  generated_at: string;
}

export interface EditorialReport {
  id: string;
  manuscript_id: string;
  overall_score?: number;
  executive_summary?: string;
  major_findings_count?: string;
  minor_findings_count?: string;
  critical_findings_count?: string;
  moderate_findings_count?: string;
  suggestions_count?: string;
  report_json: string;
  created_at: string;
}

export interface ReportListResponse {
  reports: EditorialReport[];
  total: number;
}

export interface RevisionIssue {
  title: string;
  category?: string;
  severity?: string;
  description?: string;
  note?: string;
}

export interface RevisionSummary {
  from_version: number;
  to_version: number;
  score_change: number;
  issues_fixed: RevisionIssue[];
  issues_still_present: RevisionIssue[];
  new_issues: RevisionIssue[];
  summary: string;
}

export interface DashboardStats {
  total_manuscripts: number;
  completed_manuscripts: number;
  processing_manuscripts: number;
  failed_manuscripts: number;
  total_reports: number;
  recent_manuscripts: Array<{
    id: string;
    title: string;
    status: ManuscriptStatus;
    word_count?: number;
    chapter_count?: number;
    created_at: string;
  }>;
  recent_reports: Array<{
    id: string;
    manuscript_id: string;
    overall_score?: number;
    major_findings_count?: string;
    created_at: string;
  }>;
}

export interface ApiError {
  detail: string;
}
