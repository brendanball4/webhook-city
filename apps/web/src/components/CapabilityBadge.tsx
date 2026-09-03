import { type ProjectCapability } from "@/lib/api";
import { Layers3, ScrollText, Webhook, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const CAPABILITY_META: Record<
  ProjectCapability,
  { label: string; icon: LucideIcon; blurb: string }
> = {
  Webhooks: {
    label: "Webhooks",
    icon: Webhook,
    blurb: "Receive webhook events at public ingest URLs.",
  },
  Logs: {
    label: "Log storage",
    icon: ScrollText,
    blurb: "Pipe logs from your own services.",
  },
  Both: {
    label: "Both",
    icon: Layers3,
    blurb: "Webhooks and log storage together.",
  },
};

export function CapabilityBadge({
  capability,
}: {
  capability: ProjectCapability;
}) {
  const meta = CAPABILITY_META[capability];
  const Icon = meta.icon;
  return (
    <Badge variant="secondary">
      <Icon data-icon="inline-start" />
      {meta.label}
    </Badge>
  );
}
