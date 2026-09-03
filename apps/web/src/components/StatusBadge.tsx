import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string | null }) {
  const variant =
    status === "error"
      ? "destructive"
      : status === "success"
        ? "default"
        : "secondary";

  return <Badge variant={variant}>{status ?? "Unknown"}</Badge>;
}
