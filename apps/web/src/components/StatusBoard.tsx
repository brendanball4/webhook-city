"use client";

import { useEffect, useState } from "react";
import { api, type EndpointHealth, type Health } from "@/lib/api";
import { KindBadge } from "./KindBadge";
import { timeAgo } from "@/lib/relativeTime";

const POLL_MS = 5000;

const HEALTH_META: Record<
  Health,
  { label: string; dot: string; ring: string }
> = {
  healthy: { label: "Healthy", dot: "bg-emerald-400", ring: "border-emerald-500/30" },
  failing: { label: "Failing", dot: "bg-rose-400", ring: "border-rose-500/40" },
  pending: { label: "Pending", dot: "bg-amber-400", ring: "border-amber-500/30" },
  active: { label: "Active", dot: "bg-sky-400", ring: "border-sky-500/30" },
  idle: { label: "Idle", dot: "bg-muted", ring: "border-border" },
};

const STRIP_COLOR: Record<string, string> = {
  success: "bg-emerald-400",
  error: "bg-rose-400",
  pending: "bg-amber-400",
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
        /* ignore transient errors */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [projectSlug]);

  if (health.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="font-medium mb-3">Status board</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((h) => {
          const meta = HEALTH_META[h.health];
          return (
            <div
              key={h.endpointId}
              className={`rounded-xl border bg-surface p-4 ${meta.ring}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                <span className="font-medium">{h.source}</span>
                <span className="ml-auto">
                  <KindBadge kind={h.kind} />
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{meta.label}</span>
                <span className="text-muted">{timeAgo(h.lastSeenAt)}</span>
              </div>

              {/* Recent events strip (oldest → newest) */}
              <div className="flex gap-0.5 mt-3 h-4 items-end">
                {h.recentStatuses.length === 0 ? (
                  <span className="text-xs text-muted">no events yet</span>
                ) : (
                  h.recentStatuses.map((s, i) => (
                    <span
                      key={i}
                      title={s ?? "unknown"}
                      className={`flex-1 max-w-[10px] h-3 rounded-sm ${
                        STRIP_COLOR[s ?? ""] ?? "bg-surface-2"
                      }`}
                    />
                  ))
                )}
              </div>

              {h.total > 0 && (
                <div className="text-xs text-muted mt-2">
                  {h.total} event{h.total === 1 ? "" : "s"} ·{" "}
                  <span
                    className={
                      h.failureRate > 0 ? "text-rose-300" : "text-emerald-300"
                    }
                  >
                    {Math.round(h.failureRate * 100)}% fail
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
