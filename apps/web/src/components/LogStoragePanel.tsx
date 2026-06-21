import { API_BASE } from "@/lib/api";

/**
 * Log storage capability panel. The dedicated log-ingestion pipe (API keys,
 * batching) is next-phase work; today logs can be POSTed to the same ingest
 * mechanism as webhooks. This panel documents that intent honestly.
 */
export function LogStoragePanel({ projectSlug }: { projectSlug: string }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span>📜</span>
        <h2 className="font-medium">Log storage</h2>
      </div>
      <div className="px-4 py-4 text-sm text-muted space-y-3">
        <p>
          Pipe logs from your own services into this project. They appear in the
          live feed alongside any webhook events.
        </p>
        <div>
          <div className="text-xs mb-1">Ingestion endpoint (per source)</div>
          <code className="block rounded bg-background border border-border px-2 py-1 text-xs font-mono text-foreground">
            POST {API_BASE}/ingest/{projectSlug}/&lt;source&gt;
          </code>
        </div>
        <p className="text-xs">
          Dedicated log API keys &amp; batching are on the roadmap. For now, add a
          source above to get a URL + secret and POST JSON log lines to it.
        </p>
      </div>
    </section>
  );
}
