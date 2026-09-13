const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("archscale_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
    } catch {}
    throw new Error(`API error ${res.status}: ${errorDetail}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      fetchApi<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    register: (data: { email: string; password: string; full_name: string; organization_name: string; role?: string }) =>
      fetchApi<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => fetchApi<any>("/auth/me"),
    permissions: () => fetchApi<{ role: string; permissions: string[] }>("/auth/permissions"),
    logout: () => fetchApi<{ message: string }>("/auth/logout", { method: "POST" }),
    refresh: (refresh_token: string) =>
      fetchApi<{ access_token: string; refresh_token: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token }),
      }),
  },
  dashboard: {
    get: (projectId: number) => fetchApi<any>(`/api/dashboard/${projectId}`),
  },
  projects: {
    list: () => fetchApi<any[]>("/api/projects"),
    get: (id: number) => fetchApi<any>(`/api/projects/${id}`),
  },
  stakeholders: {
    list: (projectId: number) => fetchApi<any[]>(`/api/stakeholders/project/${projectId}`),
    matrix: (projectId: number) => fetchApi<any[]>(`/api/stakeholders/matrix/${projectId}`),
    workloads: (projectId: number) => fetchApi<any[]>(`/api/stakeholders/workload/${projectId}`),
  },
  tasks: {
    list: (projectId: number) => fetchApi<any[]>(`/api/tasks/project/${projectId}`),
    create: (data: any) =>
      fetchApi<any>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (taskId: number, data: any) =>
      fetchApi<any>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  dependencies: {
    list: (projectId: number) => fetchApi<any[]>(`/api/dependencies/project/${projectId}`),
    downstream: (taskId: number) => fetchApi<any[]>(`/api/dependencies/downstream/${taskId}`),
    criticalPath: (projectId: number) => fetchApi<any[]>(`/api/dependencies/critical-path/${projectId}`),
    create: (data: { source_id: number; target_id: number; relationship_type?: string }) =>
      fetchApi<any>("/api/dependencies", { method: "POST", body: JSON.stringify(data) }),
  },
  approvals: {
    pending: (projectId: number) => fetchApi<any[]>(`/api/approvals/pending/${projectId}`),
    overdue: (projectId: number) => fetchApi<any[]>(`/api/approvals/overdue/${projectId}`),
    history: (projectId: number) => fetchApi<any[]>(`/api/approvals/history/${projectId}`),
    update: (id: number, data: any) =>
      fetchApi<any>(`/api/approvals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  changeRequests: {
    list: (projectId: number) => fetchApi<any[]>(`/api/change-requests/project/${projectId}`),
    create: (data: any) =>
      fetchApi<any>("/api/change-requests", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: number, data: any) =>
      fetchApi<any>(`/api/change-requests/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  risks: {
    list: (projectId: number) => fetchApi<any[]>(`/api/risks/project/${projectId}`),
    summary: (projectId: number) => fetchApi<any>(`/api/risks/summary/${projectId}`),
  },
  health: {
    current: (projectId: number) => fetchApi<any>(`/api/health/${projectId}`),
    history: (projectId: number) => fetchApi<any[]>(`/api/health/history/${projectId}`),
  },
  blockers: {
    list: (projectId: number) => fetchApi<any[]>(`/api/blockers/${projectId}`),
  },
  notifications: {
    list: (projectId: number) => fetchApi<any[]>(`/api/notifications/project/${projectId}`),
    markRead: (id: number) => fetchApi<any>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  },
  impact: {
    analyze: (data: { project_id: number; change_description: string; affected_task_ids?: number[] }) =>
      fetchApi<{
        affected_stakeholders: any[];
        affected_tasks: any[];
        affected_vendors: any[];
        affected_approvals: any[];
        blocked_work: any[];
        risk_level: string;
        estimated_delay_days: number;
        recommendations: string[];
        coordination_notes?: string;
      }>("/api/impact/analyze", { method: "POST", body: JSON.stringify(data) }),
  },
  graph: {
    get: (projectId: number) => fetchApi<any>(`/api/graph/${projectId}`),
  },
  ai: {
    chat: (data: { project_id: number; message: string; history?: any[] }) =>
      fetchApi<{ response: string; sources?: string[] }>("/api/ai/chat", { method: "POST", body: JSON.stringify(data) }),
    summarize: (data: { project_id: number; summary_type: string }) =>
      fetchApi<any>("/api/ai/summarize", { method: "POST", body: JSON.stringify(data) }),
    simulate: (data: { project_id: number; scenario: string }) =>
      fetchApi<any>("/api/ai/simulate", { method: "POST", body: JSON.stringify(data) }),
  },
  conversations: {
    list: (projectId: number) => fetchApi<any[]>(`/api/conversations/${projectId}`),
    upload: (data: { project_id: number; source_type: string; content: string; title?: string }) =>
      fetchApi<any>("/api/conversations/upload", { method: "POST", body: JSON.stringify(data) }),
  },
  memory: {
    search: (data: { project_id: number; query: string }) =>
      fetchApi<any>("/api/memory/search", { method: "POST", body: JSON.stringify(data) }),
  },
  demo: {
    triggerKitchenRedesign: () =>
      fetchApi<any>("/api/demo/kitchen-redesign", { method: "POST" }),
    reset: () =>
      fetchApi<any>("/api/demo/reset", { method: "POST" }),
  },
  admin: {
    dashboard: () => fetchApi<any>("/api/admin/dashboard"),
    systemHealth: () => fetchApi<any>("/api/admin/system-health"),
    users: {
      list: (params?: { page?: number; page_size?: number; search?: string; role?: string; status?: string; sort_by?: string; sort_order?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.page_size) searchParams.set("page_size", String(params.page_size));
        if (params?.search) searchParams.set("search", params.search);
        if (params?.role) searchParams.set("role", params.role);
        if (params?.status) searchParams.set("status", params.status);
        if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
        if (params?.sort_order) searchParams.set("sort_order", params.sort_order);
        const qs = searchParams.toString();
        return fetchApi<any>(`/api/admin/users${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => fetchApi<any>(`/api/admin/users/${id}`),
      create: (data: { email: string; password: string; full_name: string; role?: string; username?: string }) =>
        fetchApi<any>("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: { email?: string; username?: string; full_name?: string; role?: string; is_active?: boolean; avatar_url?: string }) =>
        fetchApi<any>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: number) =>
        fetchApi<any>(`/api/admin/users/${id}`, { method: "DELETE" }),
      toggleStatus: (id: number) =>
        fetchApi<any>(`/api/admin/users/${id}/toggle-status`, { method: "POST" }),
      resetPassword: (id: number, newPassword: string) =>
        fetchApi<any>(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ new_password: newPassword }) }),
    },
    roles: {
      list: () => fetchApi<any[]>("/api/admin/roles"),
      get: (role: string) => fetchApi<any>(`/api/admin/roles/${role}`),
    },
    auditLogs: {
      list: (params?: { page?: number; page_size?: number; search?: string; action?: string; user_id?: number; status?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.page_size) searchParams.set("page_size", String(params.page_size));
        if (params?.search) searchParams.set("search", params.search);
        if (params?.action) searchParams.set("action", params.action);
        if (params?.user_id) searchParams.set("user_id", String(params.user_id));
        if (params?.status) searchParams.set("status", params.status);
        const qs = searchParams.toString();
        return fetchApi<any>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`);
      },
    },
    notifications: {
      list: (params?: { limit?: number; offset?: number; unread_only?: boolean }) => {
        const searchParams = new URLSearchParams();
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.offset) searchParams.set("offset", String(params.offset));
        if (params?.unread_only) searchParams.set("unread_only", "true");
        const qs = searchParams.toString();
        return fetchApi<any>(`/api/admin/notifications${qs ? `?${qs}` : ""}`);
      },
      unreadCount: () => fetchApi<{ unread_count: number }>("/api/admin/notifications/unread-count"),
      markRead: (id: number) => fetchApi<any>(`/api/admin/notifications/${id}/read`, { method: "PATCH" }),
      markAllRead: () => fetchApi<any>("/api/admin/notifications/mark-all-read", { method: "POST" }),
    },
  },
};
