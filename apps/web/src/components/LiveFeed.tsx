"use client";

import { useEffect, useRef, useState } from "react";
import {
  api,
  type WebhookEvent,
  type EventKind,
  type ProjectCapability,
} from "@/lib/api";
import { EventRow } from "./EventRow";

const POLL_MS = 3000;

type Filter = "all" | EventKind;

export function LiveFeed({
  projectSlug,
  capability,
}: {
  projectSlug: string;
  capability: ProjectCapability;
}) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const liveRef = useRef(live);
  liveRef.current = live;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!liveRef.current) return;
      try {
        const kind = filterRef.current === "all" ? undefined : filterRef.current;
        const data = await api.listEvents(projectSlug, 100, kind);
        if (active) {
          setEvents(data);
          setConnected(true);
        }
      } catch {
        if (active) setConnected(false);
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [projectSlug]);

  // A mixed project gets filter tabs; single-capability projects don't need them.
  const showFilters = capability === "Both";

  function applyFilter(f: Filter) {
    setFilter(f);
    // Refetch immediately so the change feels instant rather than waiting a poll.
    const kind = f === "all" ? undefined : f;
    api.listEvents(projectSlug, 100, kind).then(setEvents).catch(() => {});
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Webhook", label: "🪝 Webhooks" },
    { key: "Log", label: "📜 Logs" },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected && live ? "bg-emerald-400 animate-pulse" : "bg-muted"
            }`}
          />
          <h2 className="font-medium">Live feed</h2>
          <span className="text-muted text-sm">({events.length})</span>
        </div>
        <button
          onClick={() => setLive((l) => !l)}
          className="text-sm rounded-md border border-border px-3 py-1 hover:bg-surface-2"
        >
          {live ? "Pause" : "Resume"}
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-1 px-4 py-2 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => applyFilter(t.key)}
              className={`text-xs rounded-md px-2.5 py-1 border transition-colors ${
                filter === t.key
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted hover:bg-surface-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-muted px-4 py-8 text-center text-sm">
          Waiting for events… POST to an endpoint below to see them stream in.
        </p>
      ) : (
        <ul>
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </section>
  );
}
