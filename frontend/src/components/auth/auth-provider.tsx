"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import type { UserRead } from "@/lib/types";

interface AuthContextValue {
  user: UserRead | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserRead>;
  register: (email: string, password: string) => Promise<UserRead>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PREFIXES = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Holds the authenticated user. Bootstraps from GET /auth/me on mount; the
 * httpOnly session cookie is the source of truth, so a 401 here means logged out.
 * The server-side proxy gates navigation; this provider is the client-side
 * fallback that bounces an expired session off protected pages.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((u) => active && setUser(u))
      .catch((error) => {
        if (active && error instanceof ApiError && error.status === 401) setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Once the session state is known, bounce an unauthenticated visitor off any
  // protected page (defense in depth behind the proxy redirect).
  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPath(pathname)) {
      // Preserve path + query so post-login returns to the exact target.
      const target = pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(target)}`);
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login({ email, password });
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const u = await api.register({ email, password });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
