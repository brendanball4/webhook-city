import { ShieldOff, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Workspace</div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Settings</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><UserRound className="size-4 text-primary" /><CardTitle>Local workspace</CardTitle><CardDescription>The app currently runs as a single local workspace.</CardDescription></CardHeader>
          <CardContent className="text-sm text-muted-foreground">User profiles and account preferences will appear here once authentication is added.</CardContent>
        </Card>
        <Card>
          <CardHeader><ShieldOff className="size-4 text-primary" /><CardTitle>Authentication</CardTitle><CardDescription>Not configured</CardDescription></CardHeader>
          <CardContent className="text-sm text-muted-foreground">There is no sign-in boundary yet. Projects, secrets, and settings are available to anyone who can reach this instance.</CardContent>
        </Card>
      </div>
    </main>
  );
}
