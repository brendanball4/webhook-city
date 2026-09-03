"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AppShell } from "./AppShell";

const AUTH_ROUTES = ["/login"];

/**
 * Decides what a visitor may see: the sign-in screen when signed out, the full
 * app shell when signed in. Keeps route protection in one place.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthRoute) router.replace("/login");
    if (user && isAuthRoute) router.replace("/");
  }, [user, loading, isAuthRoute, router]);

  if (loading) return <Waiting />;

  // Signed out: only the auth screens render; anything else is mid-redirect.
  if (!user) return isAuthRoute ? <>{children}</> : <Waiting />;

  // Signed in: the auth screen is mid-redirect back to the dashboard.
  if (isAuthRoute) return <Waiting />;

  return <AppShell>{children}</AppShell>;
}

function Waiting() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}
