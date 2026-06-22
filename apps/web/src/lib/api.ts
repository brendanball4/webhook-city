// Thin client for the Webhook City API.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type ProjectCapability = "Webhooks" | "Logs" | "Both";

export type EventKind = "Webhook" | "Log";

export interface Group {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
  projectCount: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  capability: ProjectCapability;
  groupId: string | null;
  createdAt: string;
  endpointCount: number;
}

export interface Endpoint {
  id: string;
  slug: string;
  source: string;
  kind: EventKind;
  secretToken: string;
  createdAt: string;
  ingestPath: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  capability: ProjectCapability;
  groupId: string | null;
  createdAt: string;
  endpoints: Endpoint[];
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

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
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

  listGroups: () => http<Group[]>("/api/groups"),

  createGroup: (name: string, color: string | null = null) =>
    http<Group>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    }),

  updateGroup: (id: string, name: string, color: string | null) =>
    http<Group>(`/api/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, color }),
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

  deleteEndpoint: (projectSlug: string, endpointSlug: string) =>
    http<void>(
      `/api/projects/${projectSlug}/endpoints/${endpointSlug}`,
      { method: "DELETE" },
    ),

  listEvents: (projectSlug: string, take = 50, kind?: EventKind) =>
    http<WebhookEvent[]>(
      `/api/projects/${projectSlug}/events?take=${take}` +
        (kind ? `&kind=${kind}` : ""),
    ),
};
