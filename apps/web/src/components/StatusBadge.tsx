const styles: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  error: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  unknown: "bg-surface-2 text-muted border-border",
};

export function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? "unknown";
  const cls = styles[key] ?? styles.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status ?? "—"}
    </span>
  );
}
