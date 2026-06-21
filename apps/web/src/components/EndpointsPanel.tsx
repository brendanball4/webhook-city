"use client";

import { useState } from "react";
import {
  api,
  API_BASE,
  type Endpoint,
  type EventKind,
  type ProjectCapability,
} from "@/lib/api";
import { KindBadge } from "./KindBadge";

const SOURCES = ["netlify", "circleci", "github", "stripe", "custom"];

export function EndpointsPanel({
  projectSlug,
  initial,
  capability,
  onChange,
}: {
  projectSlug: string;
  initial: Endpoint[];
  capability: ProjectCapability;
  onChange?: () => void;
}) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initial);
  const [source, setSource] = useState("netlify");
  const [kind, setKind] = useState<EventKind>(
    capability === "Logs" ? "Log" : "Webhook",
  );
  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    try {
      const ep = await api.createEndpoint(projectSlug, source, kind);
      setEndpoints((prev) => [...prev, ep]);
      // Adding a new kind may grow the project's capability — refresh the page.
      onChange?.();
    } finally {
      setAdding(false);
    }
  }

  async function remove(endpoint: Endpoint) {
    await api.deleteEndpoint(projectSlug, endpoint.slug);
    setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id));
  }

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-medium">Endpoints</h2>
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind)}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
            title="Endpoint kind"
          >
            <option value="Webhook">🪝 Webhook</option>
            <option value="Log">📜 Log</option>
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={adding}
            className="text-sm rounded-md bg-accent px-3 py-1 text-white disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {endpoints.length === 0 ? (
        <p className="text-muted px-4 py-6 text-sm text-center">
          No endpoints yet. Add one to get a webhook URL.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {endpoints.map((ep) => (
            <EndpointItem key={ep.id} endpoint={ep} onDelete={() => remove(ep)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EndpointItem({
  endpoint,
  onDelete,
}: {
  endpoint: Endpoint;
  onDelete: () => Promise<void>;
}) {
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const url = `${API_BASE}${endpoint.ingestPath}`;

  function copy(text: string, which: "url" | "secret") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">{endpoint.source}</span>
        <span className="font-mono text-xs text-muted">/{endpoint.slug}</span>
        <span className="ml-auto">
          <KindBadge kind={endpoint.kind} />
        </span>
        {confirming ? (
          <span className="flex items-center gap-1">
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="text-xs rounded-md bg-rose-600 px-2 py-1 text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {deleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-xs rounded-md border border-border px-2 py-1 hover:bg-surface-2"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            title="Delete endpoint"
            className="text-xs rounded-md border border-border px-2 py-1 text-muted hover:bg-surface-2 hover:text-rose-300"
          >
            Delete
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <code className="flex-1 truncate rounded bg-background border border-border px-2 py-1 text-xs font-mono">
          {url}
        </code>
        <button
          onClick={() => copy(url, "url")}
          className="text-xs rounded-md border border-border px-2 py-1 hover:bg-surface-2 shrink-0"
        >
          {copied === "url" ? "Copied!" : "Copy URL"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-background border border-border px-2 py-1 text-xs font-mono text-muted">
          secret: {endpoint.secretToken}
        </code>
        <button
          onClick={() => copy(endpoint.secretToken, "secret")}
          className="text-xs rounded-md border border-border px-2 py-1 hover:bg-surface-2 shrink-0"
        >
          {copied === "secret" ? "Copied!" : "Copy secret"}
        </button>
      </div>
    </li>
  );
}
