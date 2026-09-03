"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { api, type EndpointHealth, type Health } from "@/lib/api";
import { KindBadge } from "./KindBadge";
import { timeAgo } from "@/lib/relativeTime";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const POLL_MS = 5000;

const HEALTH_META: Record<
  Health,
  { label: string; dot: string; border: string }
> = {
  healthy: { label: "Healthy", dot: "bg-emerald-600", border: "border-l-emerald-600" },
  failing: { label: "Failing", dot: "bg-destructive", border: "border-l-destructive" },
  pending: { label: "Pending", dot: "bg-amber-600", border: "border-l-amber-600" },
  active: { label: "Active", dot: "bg-primary", border: "border-l-primary" },
  idle: { label: "Idle", dot: "bg-muted-foreground/40", border: "border-l-border" },
};

const STRIP_COLOR: Record<string, string> = {
  success: "bg-emerald-600",
  error: "bg-destructive",
  pending: "bg-amber-600",
};

export function StatusBoard({ projectSlug }: { projectSlug: string }) {
  const [health, setHealth] = useState<EndpointHealth[]>([]);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const data = await api.getHealth(projectSlug);
        if (active) setHealth(data);
      } catch {
        // A transient health request should not interrupt the project page.
      }
    }
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [projectSlug]);

  if (health.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-muted-foreground" />
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">
          Endpoint health
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {health.map((item) => {
          const meta = HEALTH_META[item.health];
          return (
            <Card key={item.endpointId} size="sm" className={`border-l-2 ${meta.border}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 normal-case tracking-wide">
                  <span className={`size-2 ${meta.dot}`} />
                  {item.source}
                </CardTitle>
                <CardDescription>{timeAgo(item.lastSeenAt)}</CardDescription>
                <CardAction>
                  <KindBadge kind={item.kind} />
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{meta.label}</Badge>
                  {item.total > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {item.total} event{item.total === 1 ? "" : "s"} / {Math.round(item.failureRate * 100)}% fail
                    </span>
                  )}
                </div>
                <div className="flex h-3 items-end gap-0.5">
                  {item.recentStatuses.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No events yet</span>
                  ) : (
                    item.recentStatuses.map((status, index) => (
                      <span
                        key={index}
                        title={status ?? "unknown"}
                        className={`h-2.5 max-w-3 flex-1 ${STRIP_COLOR[status ?? ""] ?? "bg-muted"}`}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
