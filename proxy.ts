import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: Set this to false in production! This is only for testing
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

export async function proxy(req: NextRequest) {
  // Temporarily disable auth for testing
  if (DISABLE_AUTH) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Explicitly public / auth routes that should always be directly accessible
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/unauthorized") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api/auth");

  if (isPublicPage) {
    return NextResponse.next();
  }

  // Check for non-empty session token cookie
  const sessionCookie =
    req.cookies.get("__Secure-authjs.session-token") ||
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-next-auth.session-token") ||
    req.cookies.get("next-auth.session-token");

  const hasValidToken = Boolean(sessionCookie?.value && sessionCookie.value.trim().length > 10);

  // Protected routes (dashboard, profile, etc.) that require authentication
  if (!hasValidToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
