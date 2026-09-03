"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  api,
  type WebhookEvent,
  type EventKind,
  type ProjectCapability,
} from "@/lib/api";
import { EventRow } from "./EventRow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!live) return;
      try {
        const kind = filter === "all" ? undefined : filter;
        const data = await api.listEvents(projectSlug, 100, kind);
        if (active) {
          setEvents(data);
          setConnected(true);
        }
      } catch {
        if (active) setConnected(false);
      }
    }

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [filter, live, projectSlug]);

  return (
    <Card className="min-h-[34rem] gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="flex items-center gap-2">
          <span
            className={`size-2 ${connected && live ? "bg-emerald-600" : "bg-muted-foreground/40"}`}
          />
          Event stream
        </CardTitle>
        <CardDescription>
          {events.length} event{events.length === 1 ? "" : "s"} loaded
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => setLive((value) => !value)}>
            {live ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {live ? "Pause" : "Resume"}
          </Button>
        </CardAction>
      </CardHeader>

      {capability === "Both" && (
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as Filter)}
          className="border-b px-5 py-3"
        >
          <TabsList variant="line">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Webhook">Webhooks</TabsTrigger>
            <TabsTrigger value="Log">Logs</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <ScrollArea className="max-h-[44rem]">
        {events.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="font-heading text-sm font-semibold uppercase tracking-wider">
              Waiting for events
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Send a request to an endpoint to begin the stream.
            </p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
