"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { api, type SlackIntegration } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SlackPanel({ projectSlug }: { projectSlug: string }) {
  const [integration, setIntegration] = useState<SlackIntegration | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSlackIntegration(projectSlug)
      .then(setIntegration)
      .catch((reason) => setError((reason as Error).message));
  }, [projectSlug]);

  async function configure() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setIntegration(await api.configureSlack(projectSlug, webhookUrl));
      setWebhookUrl("");
      setMessage("Slack connected. New events will be forwarded.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.testSlack(projectSlug);
      setMessage("Test message delivered.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.deleteSlackIntegration(projectSlug);
      setIntegration({ configured: false, enabled: false });
      setMessage("Slack disconnected.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="size-4" />
          Slack relay
        </CardTitle>
        <CardDescription>
          Forward stored Apple and Xcode Cloud events to one channel.
        </CardDescription>
        {integration?.configured && (
          <CardAction>
            <Badge>Connected</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {integration?.configured ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={test} disabled={busy}>
              Send test
            </Button>
            <Button variant="outline" onClick={remove} disabled={busy}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="password"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              autoComplete="off"
              aria-label="Slack Incoming Webhook URL"
            />
            <Button
              onClick={configure}
              disabled={busy || !webhookUrl.trim()}
            >
              Connect Slack
            </Button>
          </div>
        )}
        {(message || error) && (
          <Alert variant={error ? "destructive" : "default"}>
            <AlertDescription>{error ?? message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
