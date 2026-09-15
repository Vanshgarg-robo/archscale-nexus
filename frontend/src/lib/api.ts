const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = RequestInit & { auth?: boolean };

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("archscale_token");
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("archscale_refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      localStorage.removeItem("archscale_token");
      localStorage.removeItem("archscale_refresh_token");
      return null;
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("archscale_token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("archscale_refresh_token", data.refresh_token);
      }
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...init } = options;
  const token = getAuthToken();

  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  // Seamlessly auto-refresh token if 401 Unauthorized occurs on protected routes
  if (
    response.status === 401 &&
    auth &&
    !path.includes("/auth/login") &&
    !path.includes("/auth/refresh") &&
    !path.includes("/auth/register")
  ) {
    if (!refreshPromise) {
      refreshPromise = doRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...headers,
        },
      });
    }
  }

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    let errorDetail = `Request failed (${response.status})`;
    let body: any = null;
    try {
      body = await response.json();
      if (typeof body.detail === "string") {
        errorDetail = body.detail;
      } else if (Array.isArray(body.detail)) {
        // FastAPI / Pydantic 422 validation errors
        errorDetail = body.detail
          .map((err: any) => (err.loc ? `${err.loc.slice(1).join(".")}: ${err.msg}` : err.msg || JSON.stringify(err)))
          .join("; ");
      } else if (body.message) {
        errorDetail = body.message;
      }
    } catch {
      // response is not JSON
    }
    throw new ApiError(errorDetail, response.status, body);
  }

  return response.json() as Promise<T>;
}

const json = (method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  auth: {
    login: (username_or_email: string, password: string) =>
      request<any>("/api/auth/login", { ...json("POST", { username_or_email, password }), auth: false }),
    register: (body: Record<string, unknown>) =>
      request<any>("/api/auth/register", { ...json("POST", body), auth: false }),
    refresh: (refresh_token: string) =>
      request<any>("/api/auth/refresh", { ...json("POST", { refresh_token }), auth: false }),
    me: () => request<any>("/api/auth/me"),
    permissions: () => request<any>("/api/auth/permissions"),
    update: (body: Record<string, unknown>) => request<any>("/api/auth/me", json("PATCH", body)),
    password: (body: Record<string, unknown>) => request<any>("/api/auth/change-password", json("POST", body)),
    logout: () => request<any>("/api/auth/logout", json("POST")),
  },
  projects: {
    list: () => request<any[]>("/api/projects"),
    get: (id: number) => request<any>(`/api/projects/${id}`),
    create: (body: Record<string, unknown>) => request<any>("/api/projects", json("POST", body)),
  },
  dashboard: (id: number) => request<any>(`/api/dashboard/${id}`),
  stakeholders: {
    list: (id: number) => request<any[]>(`/api/stakeholders/project/${id}`),
    matrix: (id: number) => request<any[]>(`/api/stakeholders/matrix/${id}`),
    workloads: (id: number) => request<any[]>(`/api/stakeholders/workload/${id}`),
  },
  tasks: {
    list: (id: number) => request<any[]>(`/api/tasks/project/${id}`),
    create: (body: Record<string, unknown>) => request<any>("/api/tasks", json("POST", body)),
    update: (id: number, body: Record<string, unknown>) => request<any>(`/api/tasks/${id}`, json("PATCH", body)),
  },
  dependencies: {
    list: (id: number) => request<any[]>(`/api/dependencies/project/${id}`),
    critical: (id: number) => request<any[]>(`/api/dependencies/critical-path/${id}`),
  },
  approvals: {
    pending: (id: number) => request<any[]>(`/api/approvals/pending/${id}`),
    history: (id: number) => request<any[]>(`/api/approvals/history/${id}`),
    update: (id: number, body: Record<string, unknown>) => request<any>(`/api/approvals/${id}`, json("PATCH", body)),
  },
  changes: {
    list: (id: number) => request<any[]>(`/api/change-requests/project/${id}`),
    create: (body: Record<string, unknown>) => request<any>("/api/change-requests", json("POST", body)),
    status: (id: number, status: string) => request<any>(`/api/change-requests/${id}/status`, json("PATCH", { status })),
  },
  risks: {
    list: (id: number) => request<any[]>(`/api/risks/project/${id}`),
    summary: (id: number) => request<any>(`/api/risks/summary/${id}`),
  },
  health: {
    current: (id: number) => request<any>(`/api/health/${id}`),
    history: (id: number) => request<any[]>(`/api/health/history/${id}`),
  },
  blockers: (id: number) => request<any[]>(`/api/blockers/${id}`),
  notifications: {
    list: (id: number) => request<any[]>(`/api/notifications/project/${id}`),
    read: (id: number) => request<any>(`/api/notifications/${id}/read`, json("PATCH")),
  },
  graph: (id: number) => request<any>(`/api/graph/${id}`),
  impact: (body: Record<string, unknown>) => request<any>("/api/impact/analyze", json("POST", body)),
  ai: {
    chat: (body: Record<string, unknown>) => request<any>("/api/ai/chat", json("POST", body)),
    simulate: (body: Record<string, unknown>) => request<any>("/api/ai/simulate", json("POST", body)),
    summarize: (body: Record<string, unknown>) => request<any>("/api/ai/summarize", json("POST", body)),
  },
  memory: (body: Record<string, unknown>) => request<any>("/api/memory/search", json("POST", body)),
  conversations: {
    list: (id: number) => request<any[]>(`/api/conversations/${id}`),
    upload: (body: Record<string, unknown>) => request<any>("/api/conversations/upload", json("POST", body)),
  },
  demo: {
    kitchen: () => request<any>("/api/demo/kitchen-redesign", json("POST")),
    reset: () => request<any>("/api/demo/reset", json("POST")),
  },
  admin: {
    dashboard: () => request<any>("/api/admin/dashboard"),
    system: () => request<any>("/api/admin/system-health"),
    users: (params?: { search?: string; role?: string; status?: string; page?: number; page_size?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.role) searchParams.set("role", params.role);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.page_size) searchParams.set("page_size", String(params.page_size));
      const qs = searchParams.toString();
      return request<any>(`/api/admin/users${qs ? `?${qs}` : ""}`);
    },
    createUser: (body: Record<string, unknown>) => request<any>("/api/admin/users", json("POST", body)),
    updateUser: (id: number, body: Record<string, unknown>) => request<any>(`/api/admin/users/${id}`, json("PATCH", body)),
    deleteUser: (id: number) => request<any>(`/api/admin/users/${id}`, json("DELETE")),
    toggleUser: (id: number) => request<any>(`/api/admin/users/${id}/toggle-status`, json("POST")),
    resetPassword: (id: number, new_password: string) =>
      request<any>(`/api/admin/users/${id}/reset-password`, json("POST", { new_password })),
    roles: () => request<any[]>("/api/admin/roles"),
    audits: (params?: { search?: string; action?: string; status?: string; page?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.action) searchParams.set("action", params.action);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.page) searchParams.set("page", String(params.page));
      const qs = searchParams.toString();
      return request<any>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`);
    },
    notifications: (unread_only = false) =>
      request<any>(`/api/admin/notifications?unread_only=${unread_only}`),
    unreadCount: () => request<{ unread_count: number }>("/api/admin/notifications/unread-count"),
    readAdminNotification: (id: number) => request<any>(`/api/admin/notifications/${id}/read`, json("PATCH")),
    markAllRead: () => request<any>("/api/admin/notifications/mark-all-read", json("POST")),
  },
  assistant: {
    config: () => request<any>("/api/ai-assistant/config", { auth: false }),
    chat: (body: Record<string, unknown>) => request<any>("/api/ai-assistant/chat", json("POST", body)),
    sessions: () => request<any[]>("/api/ai-assistant/sessions"),
    createSession: (page = "/") => request<any>(`/api/ai-assistant/sessions?page=${encodeURIComponent(page)}`, json("POST")),
    sessionDetail: (uuid: string) => request<any>(`/api/ai-assistant/sessions/${uuid}`),
    deleteSession: (uuid: string) => request<any>(`/api/ai-assistant/sessions/${uuid}`, json("DELETE")),
    usage: () => request<any>("/api/ai-assistant/admin/usage"),
    configAdmin: () => request<any>("/api/ai-assistant/admin/config"),
    updateConfig: (body: Record<string, unknown>) => request<any>("/api/ai-assistant/admin/config", json("PUT", body)),

    /**
     * Streams tokens via Server-Sent Events (SSE) from /api/ai-assistant/chat/stream.
     * Yields parsed token chunks to callbacks and handles done/error events.
     */
    streamChat: async (
      body: { message: string; session_id?: string; current_page?: string; project_id?: number },
      callbacks: {
        onInit?: (session: { session_uuid: string; title: string }) => void;
        onToken: (chunk: string) => void;
        onDone: (totalTokens: number) => void;
        onError: (error: Error) => void;
      },
      signal?: AbortSignal
    ) => {
      const token = getAuthToken();
      try {
        const response = await fetch(`${API_URL}/api/ai-assistant/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`Streaming failed (${response.status}): ${errText}`);
        }

        if (!response.body) {
          throw new Error("ReadableStream not supported by browser environment");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") {
              return;
            }

            try {
              const event = JSON.parse(dataStr);
              if (event.type === "init" && callbacks.onInit) {
                callbacks.onInit(event);
              } else if (event.type === "token") {
                callbacks.onToken(event.content || "");
              } else if (event.type === "done") {
                callbacks.onDone(event.tokens_total || 0);
              } else if (event.type === "error") {
                callbacks.onError(new Error(event.content || "AI assistant encountered an error"));
              }
            } catch {
              // Ignore non-json lines
            }
          }
        }
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  },
};
