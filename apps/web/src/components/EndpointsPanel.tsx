"use client";

import { useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import {
  api,
  API_BASE,
  type Endpoint,
  type EventKind,
  type ProjectCapability,
} from "@/lib/api";
import { KindBadge } from "./KindBadge";
import { ConfirmModal } from "./ConfirmModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const SOURCES = [
  "xcode-cloud",
  "netlify",
  "circleci",
  "github",
  "stripe",
  "custom",
];

export function EndpointsPanel({
  projectSlug,
  initial,
  capability,
  onChange,
}: {
  projectSlug: string;
  initial: Endpoint[];
  capability: ProjectCapability;
  onChange?: () => void;
}) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initial);
  const [source, setSource] = useState("netlify");
  const [kind, setKind] = useState<EventKind>(
    capability === "Logs" ? "Log" : "Webhook",
  );
  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    try {
      const endpoint = await api.createEndpoint(projectSlug, source, kind);
      setEndpoints((previous) => [...previous, endpoint]);
      onChange?.();
    } finally {
      setAdding(false);
    }
  }

  async function remove(endpoint: Endpoint) {
    await api.deleteEndpoint(projectSlug, endpoint.slug);
    setEndpoints((previous) => previous.filter((item) => item.id !== endpoint.id));
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Endpoints</CardTitle>
        <CardDescription>
          Dedicated authenticated receivers for each external source.
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Select
            value={kind}
            onValueChange={(value) => value && setKind(value as EventKind)}
          >
            <SelectTrigger size="sm" aria-label="Endpoint kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Webhook">Webhook</SelectItem>
              <SelectItem value="Log">Log</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={source}
            onValueChange={(value) => value && setSource(value)}
          >
            <SelectTrigger size="sm" aria-label="Endpoint source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={add} disabled={adding}>
            <Plus data-icon="inline-start" />
            {adding ? "Adding…" : "Add"}
          </Button>
        </CardAction>
      </CardHeader>
      {endpoints.length === 0 ? (
        <CardContent className="py-8 text-center text-muted-foreground">
          No endpoints yet.
        </CardContent>
      ) : (
        <div>
          {endpoints.map((endpoint, index) => (
            <div key={endpoint.id}>
              {index > 0 && <Separator />}
              <EndpointItem endpoint={endpoint} onDelete={() => remove(endpoint)} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EndpointItem({
  endpoint,
  onDelete,
}: {
  endpoint: Endpoint;
  onDelete: () => Promise<void>;
}) {
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const url = `${API_BASE}${endpoint.ingestPath}`;

  function copy(text: string, which: "url" | "secret") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-3 px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{endpoint.source}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            /{endpoint.slug}
          </div>
        </div>
        <KindBadge kind={endpoint.kind} />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${endpoint.source} endpoint`}
        >
          <Trash2 />
        </Button>
      </div>
      <CredentialRow
        label="Payload URL"
        value={url}
        copied={copied === "url"}
        onCopy={() => copy(url, "url")}
      />
      <CredentialRow
        label="Secret"
        value={endpoint.secretToken}
        copied={copied === "secret"}
        onCopy={() => copy(endpoint.secretToken, "secret")}
      />
      {endpoint.source === "xcode-cloud" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Use the payload URL and secret in App Store Connect. Apple signs each
          request using the X-Apple-Signature header.
        </p>
      )}
      {confirming && (
        <ConfirmModal
          title={`Delete ${endpoint.source} endpoint?`}
          message="New deliveries to this URL will stop, and its stored events will be deleted."
          confirmLabel="Delete endpoint"
          onConfirm={onDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="flex min-w-0 items-center border bg-muted/40 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{value}</code>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
