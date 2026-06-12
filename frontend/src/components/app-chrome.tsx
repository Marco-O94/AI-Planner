"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth/auth-provider";

const BARE_PREFIXES = ["/login", "/register"];

/**
 * Chooses the page chrome: auth pages (login/register) render bare; everything
 * else gets the {@link AppShell} (sidebar + main). Keeps the auth screens out of
 * the app layout without relocating every existing route into a group folder.
 *
 * For protected paths it withholds rendering until the session is known, so the
 * shell's data-fetching children don't mount and fire a burst of 401s (then a
 * redirect) before {@link useAuth} resolves /auth/me.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const bare = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (bare) return <>{children}</>;

  if (loading || !user) {
    // Session unknown or absent: render nothing while the proxy / AuthProvider
    // settle the redirect. Avoids the protected-content flash + 401 storm.
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return <AppShell>{children}</AppShell>;
}
