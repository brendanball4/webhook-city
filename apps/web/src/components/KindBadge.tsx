import { ScrollText, Webhook } from "lucide-react";
import { type EventKind } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function KindBadge({ kind }: { kind: EventKind }) {
  const Icon = kind === "Webhook" ? Webhook : ScrollText;
  return (
    <Badge variant={kind === "Webhook" ? "default" : "secondary"}>
      <Icon data-icon="inline-start" />
      {kind}
    </Badge>
  );
}
