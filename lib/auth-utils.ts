import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE_NAME, UserSessionPayload } from "./jwt";
import { prisma } from "@/db/prisma";

export type AuthenticatedUser = UserSessionPayload;

/**
 * Get the current user on the server.
 * Works in Server Components, Server Actions, and Route Handlers.
 */
export async function getCurrentUser(request?: Request): Promise<AuthenticatedUser | null> {
  let token: string | undefined;

  // 1. Try to read token from request object (Route Handlers)
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (match) {
        token = match.substring(SESSION_COOKIE_NAME.length + 1);
      }
    }
  }

  // 2. If not found in request, read from next/headers cookies() (Server Components)
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Fallback if cookies() is called outside request scope
    }
  }

  // 3. Verify JWT token
  if (token) {
    const verified = await verifySessionToken(token);
    if (verified) {
      return verified;
    }
  }

  return null;
}

/**
 * Require authentication - redirects to /login if user is not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require specific role - redirects to /unauthorized if role doesn't match
 */
export async function requireRole(role: UserRole | UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  const requiredRoles = Array.isArray(role) ? role : [role];

  if (!requiredRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if user is accountant or admin
 */
export function canManageFinancial(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.ACCOUNTANT;
}

/**
 * Get permission level for a role
 */
export function getPermissionLevel(role: UserRole): number {
  switch (role) {
    case UserRole.ADMIN:
      return 3;
    case UserRole.ACCOUNTANT:
      return 2;
    case UserRole.VIEWER:
      return 1;
    default:
      return 0;
  }
}
