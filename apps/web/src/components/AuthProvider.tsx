"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, type AuthUser } from "@/lib/api";
import { setAccessToken, setSessionEndedHandler } from "@/lib/authToken";

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial refresh attempt settles, so pages avoid flashing. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  /** Requires the current password. Ends every other session on success. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateDisplayName: (displayName: string | null) => Promise<void>;
  /** Ends every session, including this one, then returns to sign-in. */
  logoutEverywhere: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let active = true;

    api
      .refreshSession()
      .then((session) => {
        if (!active) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
      })
      .catch(() => {
        // No valid cookie — the visitor is simply signed out.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // A failed refresh mid-session drops the user back to the sign-in screen.
  useEffect(() => {
    setSessionEndedHandler(() => {
      setUser(null);
      router.push("/login");
    });
    return () => setSessionEndedHandler(null);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const session = await api.register(email, password, displayName);
      setAccessToken(session.accessToken);
      setUser(session.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      // The server rotates every token, so adopt the fresh pair it returns
      // or this tab would be signed out by its own password change.
      const session = await api.changePassword(currentPassword, newPassword);
      setAccessToken(session.accessToken);
      setUser(session.user);
    },
    [],
  );

  const updateDisplayName = useCallback(async (displayName: string | null) => {
    setUser(await api.updateProfile(displayName));
  }, []);

  const logoutEverywhere = useCallback(async () => {
    try {
      await api.logoutAll();
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        changePassword,
        updateDisplayName,
        logoutEverywhere,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
