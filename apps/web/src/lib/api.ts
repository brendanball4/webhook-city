// Thin client for the Webhook City API.

import {
  getAccessToken,
  setAccessToken,
  notifySessionEnded,
} from "./authToken";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type ProjectRole = "Owner" | "Editor" | "Viewer";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthConfig {
  /** False when self-service sign-up is closed on this instance. */
  registrationOpen: boolean;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface ProjectMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: ProjectRole;
  createdAt: string;
}

export type ProjectCapability = "Webhooks" | "Logs" | "Both";

export type EventKind = "Webhook" | "Log";

export interface Group {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  parentId: string | null;
  createdAt: string;
  projectCount: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  capability: ProjectCapability;
  groupId: string | null;
  role: ProjectRole;
  createdAt: string;
  endpointCount: number;
}

export interface Endpoint {
  id: string;
  slug: string;
  source: string;
  kind: EventKind;
  /** Null for Viewers — only owners and editors receive the ingest secret. */
  secretToken: string | null;
  createdAt: string;
  ingestPath: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  capability: ProjectCapability;
  groupId: string | null;
  role: ProjectRole;
  createdAt: string;
  endpoints: Endpoint[];
}

export type Health = "healthy" | "failing" | "pending" | "active" | "idle";

export interface EndpointHealth {
  endpointId: string;
  source: string;
  slug: string;
  kind: EventKind;
  lastSeenAt: string | null;
  lastStatus: string | null;
  health: Health;
  total: number;
  successCount: number;
  errorCount: number;
  pendingCount: number;
  failureRate: number;
  recentStatuses: (string | null)[];
}

export interface WebhookEvent {
  id: string;
  endpointId: string;
  projectId: string;
  receivedAt: string;
  source: string;
  kind: EventKind;
  status: string | null;
  method: string;
  headers: Record<string, unknown> | null;
  body: Record<string, unknown> | null;
}

export type IntegrationProvider = "Slack" | "Discord";

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  name: string;
  enabled: boolean;
  createdAt: string;
  /** Empty means the integration listens to every endpoint. */
  endpointIds: string[];
}

/** Endpoints that must not trigger the refresh-and-retry loop. */
const AUTH_PATHS = ["/api/auth/refresh", "/api/auth/login", "/api/auth/register"];

function send(path: string, init?: RequestInit) {
  const token = getAccessToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    // Sends the httpOnly refresh cookie.
    credentials: "include",
    cache: "no-store",
  });
}

// A single in-flight refresh is shared, so N concurrent 401s cause one refresh.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthResponse;
      setAccessToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init);

  // Access tokens are short-lived: on 401, silently refresh once and retry.
  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    if (await refreshAccessToken()) {
      res = await send(path, init);
    } else {
      notifySessionEnded();
    }
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string, displayName?: string) =>
    http<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),

  getAuthConfig: () => http<AuthConfig>("/api/auth/config"),

  login: (email: string, password: string) =>
    http<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** Exchanges the httpOnly refresh cookie for a new session on page load. */
  refreshSession: () =>
    http<AuthResponse>("/api/auth/refresh", { method: "POST" }),

  logout: () => http<void>("/api/auth/logout", { method: "POST" }),

  me: () => http<AuthUser>("/api/auth/me"),

  listMembers: (projectSlug: string) =>
    http<ProjectMember[]>(`/api/projects/${projectSlug}/members`),

  shareProject: (projectSlug: string, email: string, role: ProjectRole) =>
    http<ProjectMember>(`/api/projects/${projectSlug}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateMemberRole: (projectSlug: string, userId: string, role: ProjectRole) =>
    http<ProjectMember>(`/api/projects/${projectSlug}/members/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  removeMember: (projectSlug: string, userId: string) =>
    http<void>(`/api/projects/${projectSlug}/members/${userId}`, {
      method: "DELETE",
    }),

  listProjects: () => http<Project[]>("/api/projects"),

  getProject: (slug: string) =>
    http<ProjectDetail>(`/api/projects/${slug}`),

  createProject: (
    name: string,
    capability: ProjectCapability,
    groupId: string | null = null,
  ) =>
    http<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, capability, groupId }),
    }),

  setProjectGroup: (slug: string, groupId: string | null) =>
    http<Project>(`/api/projects/${slug}/group`, {
      method: "PUT",
      body: JSON.stringify({ groupId }),
    }),

  /** Requires the current password; revokes all other sessions on success. */
  changePassword: (currentPassword: string, newPassword: string) =>
    http<AuthResponse>("/api/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  updateProfile: (displayName: string | null) =>
    http<AuthUser>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ displayName }),
    }),

  /** Signs out every device, including this one. */
  logoutAll: () => http<void>("/api/auth/logout-all", { method: "POST" }),

  listGroups: () => http<Group[]>("/api/groups"),

  createGroup: (name: string, color: string | null = null, parentId: string | null = null) =>
    http<Group>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name, color, parentId }),
    }),

  updateGroup: (id: string, name: string, color: string | null, parentId: string | null) =>
    http<Group>(`/api/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, color, parentId }),
    }),

  deleteGroup: (id: string) =>
    http<void>(`/api/groups/${id}`, { method: "DELETE" }),

  createEndpoint: (projectSlug: string, source: string, kind: EventKind) =>
    http<Endpoint>(`/api/projects/${projectSlug}/endpoints`, {
      method: "POST",
      body: JSON.stringify({ source, kind }),
    }),

  deleteProject: (slug: string) =>
    http<void>(`/api/projects/${slug}`, { method: "DELETE" }),

  listEndpoints: (projectSlug: string) =>
    http<Endpoint[]>(`/api/projects/${projectSlug}/endpoints`),

  /** Changes an endpoint's label. The ingest URL (slug) is unaffected. */
  renameEndpoint: (projectSlug: string, endpointSlug: string, source: string) =>
    http<Endpoint>(`/api/projects/${projectSlug}/endpoints/${endpointSlug}`, {
      method: "PUT",
      body: JSON.stringify({ source }),
    }),

  deleteEndpoint: (projectSlug: string, endpointSlug: string) =>
    http<void>(
      `/api/projects/${projectSlug}/endpoints/${endpointSlug}`,
      { method: "DELETE" },
    ),

  listIntegrations: (projectSlug: string) =>
    http<Integration[]>(`/api/projects/${projectSlug}/integrations`),

  createIntegration: (
    projectSlug: string,
    provider: IntegrationProvider,
    name: string,
    webhookUrl: string,
    endpointIds: string[],
  ) =>
    http<Integration>(`/api/projects/${projectSlug}/integrations`, {
      method: "POST",
      body: JSON.stringify({ provider, name, webhookUrl, endpointIds }),
    }),

  updateIntegration: (
    projectSlug: string,
    id: string,
    name: string,
    enabled: boolean,
    endpointIds: string[],
    // Omit to keep the stored webhook URL.
    webhookUrl?: string,
  ) =>
    http<Integration>(`/api/projects/${projectSlug}/integrations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, enabled, endpointIds, webhookUrl }),
    }),

  deleteIntegration: (projectSlug: string, id: string) =>
    http<void>(`/api/projects/${projectSlug}/integrations/${id}`, {
      method: "DELETE",
    }),

  testIntegration: (projectSlug: string, id: string) =>
    http<{ delivered: boolean }>(
      `/api/projects/${projectSlug}/integrations/${id}/test`,
      { method: "POST" },
    ),

  getHealth: (projectSlug: string) =>
    http<EndpointHealth[]>(`/api/projects/${projectSlug}/health`),

  listEvents: (projectSlug: string, take = 50, kind?: EventKind) =>
    http<WebhookEvent[]>(
      `/api/projects/${projectSlug}/events?take=${take}` +
        (kind ? `&kind=${kind}` : ""),
    ),
};
