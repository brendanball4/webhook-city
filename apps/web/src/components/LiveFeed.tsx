"use client";

import { useEffect, useRef, useState } from "react";
import { api, type WebhookEvent } from "@/lib/api";
import { EventRow } from "./EventRow";

const POLL_MS = 3000;

export function LiveFeed({ projectSlug }: { projectSlug: string }) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!liveRef.current) return;
      try {
        const data = await api.listEvents(projectSlug, 100);
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

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected && live
                ? "bg-emerald-400 animate-pulse"
                : "bg-muted"
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
