"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
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

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Null while unknown, so the link does not flash in and out on load.
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  const isRegister = mode === "register";

  useEffect(() => {
    let active = true;
    api
      .getAuthConfig()
      .then((config) => {
        if (!active) return;
        setRegistrationOpen(config.registrationOpen);
        // Never strand someone on a form the server will reject.
        if (!config.registrationOpen) setMode("login");
      })
      .catch(() => {
        // If the check fails, hide sign-up rather than offering a dead form.
        if (active) setRegistrationOpen(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await register(email, password, displayName || undefined);
      } else {
        await login(email, password);
      }
      router.replace("/");
    } catch (reason) {
      setError(friendlyError((reason as Error).message, isRegister));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Image
            src="/logo.png"
            alt=""
            width={96}
            height={96}
            priority
            className="mx-auto size-24 object-contain"
          />
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Webhook City
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {isRegister ? "Create your account" : "Sign in"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? "Get started" : "Welcome back"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Your projects and events are private to your account."
                : "Sign in to see your projects and live event feeds."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Name (optional)</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={isRegister ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
                {isRegister && (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters.
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? isRegister
                    ? "Creating account…"
                    : "Signing in…"
                  : isRegister
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {registrationOpen && (
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "No account yet?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode(isRegister ? "login" : "register");
                setError(null);
              }}
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
        )}
      </div>
    </main>
  );
}

/** The API returns "API 401: Invalid email or password." — show just the message. */
function friendlyError(raw: string, isRegister: boolean) {
  const stripped = raw.replace(/^API \d+:\s*/, "").trim();
  if (stripped) return stripped;
  return isRegister ? "Could not create the account." : "Could not sign in.";
}
