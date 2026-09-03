import { ScrollText } from "lucide-react";
import { API_BASE } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LogStoragePanel({ projectSlug }: { projectSlug: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4" />
          Log storage
        </CardTitle>
        <CardDescription>
          Pipe application logs into the same searchable event stream.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ingestion endpoint
        </div>
        <code className="block overflow-x-auto border bg-muted/50 px-3 py-2 font-mono text-xs">
          POST {API_BASE}/ingest/{projectSlug}/&lt;source&gt;
        </code>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Add a log endpoint above to generate its secret. Dedicated batching
          and API keys remain on the roadmap.
        </p>
      </CardContent>
    </Card>
  );
}
