import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
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
    pathname.startsWith("/api");

  if (isPublicPage) {
    return NextResponse.next();
  }

  // Check for any session token cookie (supports all naming conventions & chunked cookies like .0)
  const allCookies = req.cookies.getAll();
  const hasSessionToken = allCookies.some(
    (cookie) =>
      (cookie.name.includes("session-token") ||
        cookie.name.includes("authjs") ||
        cookie.name.includes("next-auth")) &&
      Boolean(cookie.value && cookie.value.trim().length > 0)
  );

  // If no session token cookie is found on protected routes, redirect to login
  if (!hasSessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
