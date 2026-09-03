"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { type WebhookEvent } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";
import { KindBadge } from "./KindBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function EventRow({ event }: { event: WebhookEvent }) {
  const [open, setOpen] = useState(false);
  const time = new Date(event.receivedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b last:border-b-0">
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto w-full justify-start px-5 py-4 text-left normal-case tracking-normal"
          />
        }
      >
        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
          {time}
        </span>
        <span className="hidden w-12 shrink-0 font-mono text-xs text-muted-foreground sm:inline">
          {event.method}
        </span>
        <KindBadge kind={event.kind} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {event.source}
        </span>
        <StatusBadge status={event.status} />
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4 bg-muted/35 px-5 py-5 xl:grid-cols-2">
          <JsonBlock label="Body" data={event.body} />
          <JsonBlock label="Headers" data={event.headers} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function JsonBlock({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <ScrollArea className="h-72 border bg-background">
        <pre className="min-w-max p-4 font-mono text-xs leading-relaxed">
          {data ? JSON.stringify(data, null, 2) : "No data"}
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
