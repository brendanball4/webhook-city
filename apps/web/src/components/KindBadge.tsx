import { type EventKind } from "@/lib/api";

export const KIND_META: Record<EventKind, { label: string; icon: string; cls: string }> = {
  Webhook: {
    label: "Webhook",
    icon: "🪝",
    cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  Log: {
    label: "Log",
    icon: "📜",
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
};

export function KindBadge({ kind }: { kind: EventKind }) {
  const meta = KIND_META[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
