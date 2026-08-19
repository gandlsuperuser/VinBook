import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: Set this to false in production! This is only for testing
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

export async function proxy(req: NextRequest) {
  // Temporarily disable auth for testing
  if (DISABLE_AUTH) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicPage = pathname === "/" || pathname.startsWith("/public");

  // Allow API auth routes and public pages
  if (isApiAuth || isPublicPage) {
    return NextResponse.next();
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protected routes that require authentication
  if (!token && !isAuthPage) {
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


