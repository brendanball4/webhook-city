"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const MIN_PASSWORD_LENGTH = 8;

export default function SettingsPage() {
  const { user, changePassword, updateDisplayName, logoutEverywhere } = useAuth();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-5 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Account
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Settings
        </h1>
      </div>

      <ProfileCard
        email={user?.email ?? ""}
        displayName={user?.displayName ?? ""}
        onSave={updateDisplayName}
      />
      <PasswordCard onChange={changePassword} />
      <SessionsCard onSignOutEverywhere={logoutEverywhere} />
    </main>
  );
}

function ProfileCard({
  email,
  displayName,
  onSave,
}: {
  email: string;
  displayName: string;
  onSave: (displayName: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // The provider hydrates the user after mount, so adopt it when it lands.
  useEffect(() => setDraft(displayName), [displayName]);

  async function save() {
    setSaving(true);
    setDone(false);
    try {
      await onSave(draft.trim() || null);
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <UserRound className="size-4 text-primary" />
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          How you appear to people you share projects with.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            Your email is the identity others use to share projects with you and
            cannot be changed here.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {done && <span className="text-sm text-muted-foreground">Saved.</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard({
  onChange,
}: {
  onChange: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= MIN_PASSWORD_LENGTH && next === confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      await onChange(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (reason) {
      // The API returns a plain-text reason, e.g. a wrong current password.
      const message = (reason as Error).message;
      setError(
        message.replace(/^API \d+:\s*/, "") || "Could not change password.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <KeyRound className="size-4 text-primary" />
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Changing your password signs out every other device.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>

          {tooShort && (
            <p className="text-sm text-destructive">
              Password must be at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
          {mismatch && (
            <p className="text-sm text-destructive">Passwords do not match.</p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {done && (
            <p className="text-sm text-muted-foreground">
              Password changed. Other devices have been signed out.
            </p>
          )}

          <Button type="submit" disabled={!canSubmit || saving}>
            {saving ? "Changing…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionsCard({
  onSignOutEverywhere,
}: {
  onSignOutEverywhere: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <CardHeader className="border-b">
        <LogOut className="size-4 text-primary" />
        <CardTitle>Sessions</CardTitle>
        <CardDescription>
          Signed-in devices stay authenticated for up to 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          If you have signed in somewhere you no longer control, end every
          session immediately. You will need to sign in again here too.
        </p>
        <Button variant="outline" onClick={() => setConfirming(true)}>
          Sign out everywhere
        </Button>
      </CardContent>

      {confirming && (
        <ConfirmModal
          title="Sign out everywhere?"
          message="Every device, including this one, will be signed out immediately."
          confirmLabel="Sign out everywhere"
          onConfirm={onSignOutEverywhere}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Card>
  );
}
