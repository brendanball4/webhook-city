"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import { api, type ProjectMember, type ProjectRole } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SHAREABLE_ROLES: ProjectRole[] = ["Viewer", "Editor"];

const ROLE_HINT: Record<string, string> = {
  Viewer: "Can read events and health. Never sees ingest secrets.",
  Editor: "Can manage endpoints and see ingest secrets.",
  Owner: "Full control, including deleting and sharing.",
};

export function SharePanel({
  projectSlug,
  role,
}: {
  projectSlug: string;
  role: ProjectRole;
}) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<ProjectRole>("Viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = role === "Owner";

  const load = () =>
    api
      .listMembers(projectSlug)
      .then(setMembers)
      .catch(() => undefined);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug]);

  async function share(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.shareProject(projectSlug, email.trim(), newRole);
      setEmail("");
      await load();
    } catch (reason) {
      setError((reason as Error).message.replace(/^API \d+:\s*/, ""));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, value: ProjectRole) {
    await api.updateMemberRole(projectSlug, userId, value);
    await load();
  }

  async function revoke(userId: string) {
    await api.removeMember(projectSlug, userId);
    await load();
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 normal-case tracking-wide">
          <Users className="size-4 text-muted-foreground" />
          Sharing
        </CardTitle>
        <CardDescription>
          {isOwner
            ? "Give teammates access to this project."
            : `You have ${role} access to this project.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isOwner && (
          <form onSubmit={share} className="flex flex-wrap gap-2">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              aria-label="Email to share with"
              className="min-w-48 flex-1"
            />
            <Select
              value={newRole}
              onValueChange={(value) => value && setNewRole(value as ProjectRole)}
            >
              <SelectTrigger className="w-32">
                <SelectValue>{newRole}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SHAREABLE_ROLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={busy || !email.trim()}>
              <UserPlus />
              {busy ? "Sharing…" : "Share"}
            </Button>
          </form>
        )}

        {isOwner && (
          <p className="text-xs text-muted-foreground">{ROLE_HINT[newRole]}</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not shared with anyone yet.
          </p>
        ) : (
          <ul className="divide-y">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {member.displayName ?? member.email}
                  </div>
                  {member.displayName && (
                    <div className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </div>
                  )}
                </div>

                {isOwner ? (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        value && changeRole(member.userId, value as ProjectRole)
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue>{member.role}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SHAREABLE_ROLES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => revoke(member.userId)}
                      aria-label={`Remove ${member.email}`}
                    >
                      <Trash2 />
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary">{member.role}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
