import {
  User,
  TokenResponse,
  Manuscript,
  ManuscriptListResponse,
  EditorialReport,
  ReportListResponse,
  DashboardStats,
  RevisionSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public raw?: unknown
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    let raw: unknown;
    try {
      raw = await response.json();
      const r = raw as Record<string, unknown>;
      detail = (typeof r.detail === "string" ? r.detail : JSON.stringify(r.detail)) || detail;
    } catch {}
    throw new ApiError(response.status, detail, raw);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const authApi = {
  register: (data: { email: string; username: string; full_name: string; password: string }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
};

export const usersApi = {
  me: (token: string) =>
    request<User>("/users/me", {}, token),
};

export const manuscriptsApi = {
  upload: (formData: FormData, token: string) =>
    request<Manuscript>("/manuscripts/upload", { method: "POST", body: formData }, token),

  list: (token: string, limit = 20, offset = 0) =>
    request<ManuscriptListResponse>(`/manuscripts?limit=${limit}&offset=${offset}`, {}, token),

  get: (id: string, token: string) =>
    request<Manuscript>(`/manuscripts/${id}`, {}, token),

  process: (id: string, token: string) =>
    request<Manuscript>(`/manuscripts/${id}/process`, { method: "POST" }, token),

  getDocument: (id: string, token: string) =>
    request<unknown>(`/manuscripts/${id}/document`, {}, token),

  delete: (id: string, token: string) =>
    request<null>(`/manuscripts/${id}`, { method: "DELETE" }, token),

  getVersions: (id: string, token: string) =>
    request<ManuscriptListResponse>(`/manuscripts/${id}/versions`, {}, token),

  getRevisionSummary: (id: string, token: string) =>
    request<RevisionSummary>(`/manuscripts/${id}/revision-summary`, {}, token),

  downloadFile: (id: string, token: string) =>
    fetch(`${API_BASE}/manuscripts/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const reportsApi = {
  list: (token: string, limit = 20) =>
    request<ReportListResponse>(`/reports?limit=${limit}`, {}, token),

  get: (id: string, token: string) =>
    request<EditorialReport>(`/reports/${id}`, {}, token),

  getByManuscript: (manuscriptId: string, token: string) =>
    request<EditorialReport>(`/reports/by-manuscript/${manuscriptId}`, {}, token),

  downloadJson: (reportId: string, token: string) =>
    fetch(`${API_BASE}/reports/${reportId}/json`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const dashboardApi = {
  stats: (token: string) =>
    request<DashboardStats>("/dashboard", {}, token),
};

export { ApiError };
