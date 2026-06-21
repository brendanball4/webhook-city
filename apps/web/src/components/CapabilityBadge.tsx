import { type ProjectCapability } from "@/lib/api";

export const CAPABILITY_META: Record<
  ProjectCapability,
  { label: string; icon: string; blurb: string }
> = {
  Webhooks: {
    label: "Webhooks",
    icon: "🪝",
    blurb: "Receive webhook events at public ingest URLs.",
  },
  Logs: {
    label: "Log storage",
    icon: "📜",
    blurb: "Pipe logs from your own services.",
  },
  Both: {
    label: "Both",
    icon: "⚡",
    blurb: "Webhooks and log storage together.",
  },
};

export function CapabilityBadge({
  capability,
}: {
  capability: ProjectCapability;
}) {
  const meta = CAPABILITY_META[capability];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
