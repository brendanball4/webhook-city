"use client";

import { useState } from "react";
import { type WebhookEvent } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

export function EventRow({ event }: { event: WebhookEvent }) {
  const [open, setOpen] = useState(false);
  const time = new Date(event.receivedAt).toLocaleTimeString();

  return (
    <li className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors"
      >
        <span className="text-muted text-xs font-mono w-20 shrink-0">{time}</span>
        <span className="text-xs font-mono text-muted w-16 shrink-0">
          {event.method}
        </span>
        <span className="font-medium text-sm flex-1 truncate">{event.source}</span>
        <StatusBadge status={event.status} />
        <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 grid gap-3 md:grid-cols-2">
          <JsonBlock label="Body" data={event.body} />
          <JsonBlock label="Headers" data={event.headers} />
        </div>
      )}
    </li>
  );
}

function JsonBlock({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      <pre className="rounded-lg bg-background border border-border p-3 text-xs overflow-x-auto font-mono">
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}
