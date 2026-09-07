"use client";

import { useEffect, useState } from "react";
import { Plug, Send, Trash2 } from "lucide-react";
import {
  api,
  type Endpoint,
  type Integration,
  type IntegrationProvider,
  type ProjectRole,
} from "@/lib/api";
import { ConfirmModal } from "./ConfirmModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDERS: {
  value: IntegrationProvider;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    value: "Slack",
    label: "Slack",
    hint: "Slack Incoming Webhook URL",
    placeholder: "https://hooks.slack.com/services/...",
  },
  {
    value: "Discord",
    label: "Discord",
    hint: "Discord channel webhook URL",
    placeholder: "https://discord.com/api/webhooks/...",
  },
];

export function IntegrationsPanel({
  projectSlug,
  endpoints,
  role,
}: {
  projectSlug: string;
  endpoints: Endpoint[];
  role: ProjectRole;
}) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [provider, setProvider] = useState<IntegrationProvider>("Discord");
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Integration | null>(null);

  // Webhook URLs are credentials for the owner's workspace, so only they manage them.
  const canManage = role === "Owner";
  const meta = PROVIDERS.find((entry) => entry.value === provider) ?? PROVIDERS[0];

  function reload() {
    return api
      .listIntegrations(projectSlug)
      .then(setIntegrations)
      .catch((reason) => setError((reason as Error).message));
  }

  useEffect(() => {
    let active = true;
    api
      .listIntegrations(projectSlug)
      .then((data) => {
        if (active) setIntegrations(data);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    return () => {
      active = false;
    };
  }, [projectSlug]);

  function toggleEndpoint(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function create() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.createIntegration(
        projectSlug,
        provider,
        name.trim() || meta.label,
        webhookUrl.trim(),
        selected,
      );
      setName("");
      setWebhookUrl("");
      setSelected([]);
      await reload();
      setMessage(meta.label + " connected.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function test(integration: Integration) {
    setError(null);
    setMessage(null);
    try {
      await api.testIntegration(projectSlug, integration.id);
      setMessage("Test message sent to " + integration.name + ".");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function toggleEnabled(integration: Integration) {
    try {
      await api.updateIntegration(
        projectSlug,
        integration.id,
        integration.name,
        !integration.enabled,
        integration.endpointIds,
      );
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function remove(integration: Integration) {
    await api.deleteIntegration(projectSlug, integration.id);
    await reload();
  }

  function scopeLabel(integration: Integration) {
    if (integration.endpointIds.length === 0) return "All endpoints";
    const names = endpoints
      .filter((endpoint) => integration.endpointIds.includes(endpoint.id))
      .map((endpoint) => `${endpoint.source} (${endpoint.kind.toLowerCase()})`);
    return names.length > 0
      ? names.join(", ")
      : integration.endpointIds.length + " endpoints";
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Plug className="size-4 text-muted-foreground" />
          Integrations
        </CardTitle>
        <CardDescription>
          Relay events to Slack or Discord. Each destination can listen to every
          endpoint, or only the ones you pick.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No integrations yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {integrations.map((integration) => (
              <li
                key={integration.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <Badge variant="secondary">{integration.provider}</Badge>
                <span className="font-medium">{integration.name}</span>
                <span className="text-xs text-muted-foreground">
                  {scopeLabel(integration)}
                </span>
                {!integration.enabled && <Badge variant="outline">Paused</Badge>}

                {canManage && (
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => test(integration)}
                      title="Send a test message"
                    >
                      <Send className="size-3.5" />
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEnabled(integration)}
                    >
                      {integration.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleting(integration)}
                      aria-label={"Delete " + integration.name}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select
                  value={provider}
                  onValueChange={(value) =>
                    value && setProvider(value as IntegrationProvider)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{meta.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="integration-name">Label</Label>
                <Input
                  id="integration-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Deploys channel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="integration-url">{meta.hint}</Label>
              <Input
                id="integration-url"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder={meta.placeholder}
              />
            </div>

            <div className="space-y-2">
              <Label>Endpoints</Label>
              <p className="text-xs text-muted-foreground">
                Leave all unselected to relay every endpoint in this project.
              </p>
              {endpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This project has no endpoints yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {endpoints.map((endpoint) => (
                    <Button
                      key={endpoint.id}
                      type="button"
                      variant={
                        selected.includes(endpoint.id) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleEndpoint(endpoint.id)}
                      title={`/${endpoint.slug}`}
                    >
                      <span>{endpoint.source}</span>
                      {/* Two endpoints can share a source (one Log, one Webhook),
                          so always show the kind and unique slug. */}
                      <span className="opacity-60">
                        {endpoint.kind === "Log" ? "log" : "webhook"} /{endpoint.slug}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={create} disabled={busy || !webhookUrl.trim()}>
              {busy ? "Connecting..." : "Add integration"}
            </Button>
          </div>
        )}
      </CardContent>

      {deleting && (
        <ConfirmModal
          title={"Delete " + deleting.name + "?"}
          message="This project will stop relaying events to that destination. The webhook itself is not affected."
          confirmLabel="Delete integration"
          onConfirm={async () => {
            await remove(deleting);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Card>
  );
}
