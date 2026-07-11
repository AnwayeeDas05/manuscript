/**
 * Authenticated API client — all requests include the JWT Bearer token.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
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

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail || JSON.stringify(err);
    } catch {}
    throw new ApiError(response.status, detail);
  }

  // 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; username: string; full_name: string; password: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; expires_in: number }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(data) }
    ),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: (token: string) =>
    request<import("./types").User>("/users/me", {}, token),
};

// ── Manuscripts ───────────────────────────────────────────────────────────────

export const manuscriptsApi = {
  upload: (formData: FormData, token: string) =>
    request<import("./types").Manuscript>(
      "/manuscripts/upload",
      { method: "POST", body: formData },
      token
    ),

  list: (token: string, limit = 20, offset = 0) =>
    request<import("./types").ManuscriptListResponse>(
      `/manuscripts?limit=${limit}&offset=${offset}`,
      {},
      token
    ),

  get: (id: string, token: string) =>
    request<import("./types").Manuscript>(`/manuscripts/${id}`, {}, token),

  process: (id: string, token: string) =>
    request<import("./types").Manuscript>(
      `/manuscripts/${id}/process`,
      { method: "POST" },
      token
    ),

  getDocument: (id: string, token: string) =>
    request(`/manuscripts/${id}/document`, {}, token),

  delete: (id: string, token: string) =>
    request<null>(`/manuscripts/${id}`, { method: "DELETE" }, token),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  list: (token: string, limit = 20) =>
    request<import("./types").ReportListResponse>(`/reports?limit=${limit}`, {}, token),

  get: (id: string, token: string) =>
    request<import("./types").EditorialReport>(`/reports/${id}`, {}, token),

  getByManuscript: (manuscriptId: string, token: string) =>
    request<import("./types").EditorialReport>(`/reports/by-manuscript/${manuscriptId}`, {}, token),

  downloadJson: (reportId: string, token: string) =>
    fetch(`${API_BASE}/reports/${reportId}/json`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: (token: string) =>
    request<import("./types").DashboardStats>("/dashboard", {}, token),
};

export { ApiError };
