// Thin client for the Webhook City API.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type ProjectCapability = "Webhooks" | "Logs" | "Both";

export interface Project {
  id: string;
  name: string;
  slug: string;
  capability: ProjectCapability;
  createdAt: string;
  endpointCount: number;
}

export interface Endpoint {
  id: string;
  slug: string;
  source: string;
  secretToken: string;
  createdAt: string;
  ingestPath: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  capability: ProjectCapability;
  createdAt: string;
  endpoints: Endpoint[];
}

export interface WebhookEvent {
  id: string;
  endpointId: string;
  projectId: string;
  receivedAt: string;
  source: string;
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
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => http<Project[]>("/api/projects"),

  getProject: (slug: string) =>
    http<ProjectDetail>(`/api/projects/${slug}`),

  createProject: (name: string, capability: ProjectCapability) =>
    http<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, capability }),
    }),

  createEndpoint: (projectSlug: string, source: string) =>
    http<Endpoint>(`/api/projects/${projectSlug}/endpoints`, {
      method: "POST",
      body: JSON.stringify({ source }),
    }),

  listEvents: (projectSlug: string, take = 50) =>
    http<WebhookEvent[]>(
      `/api/projects/${projectSlug}/events?take=${take}`,
    ),
};
