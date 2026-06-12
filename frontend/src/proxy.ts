import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed the `middleware` convention to `proxy` (Node.js runtime).
// This is the first gate: a fast cookie-presence check that redirects before any
// page renders. Real validation (expiry, revocation) happens server-side via the
// backend's /auth/me, surfaced client-side by AuthProvider.

// Must match the backend's SESSION_COOKIE_NAME. Read from the env (proxy runs in
// the Node runtime) so overriding the backend cookie name doesn't silently break
// the gate. The cookie is host-scoped (port-agnostic), so it is visible here even
// though the API runs on a different port/origin than the Next.js server.
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "ai_planner_session";
const AUTH_PATHS = ["/login", "/register"];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const authPage = isAuthPath(pathname);

  if (!hasSession && !authPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve the full original target (path + query) so post-login lands right.
    const target = request.nextUrl.pathname + request.nextUrl.search;
    url.search = "";
    url.searchParams.set("next", target);
    return NextResponse.redirect(url);
  }

  if (hasSession && authPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every page, excluding API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
