import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";

// TODO: Set this to false in production! This is only for testing
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

import { auth } from "@/lib/auth";

/**
 * Get the current user on the server
 * Works in both API routes and server components
 */
export async function getCurrentUser(request?: Request) {
  // Temporarily disable auth for testing - return mock user with real organization
  if (DISABLE_AUTH) {
    try {
      // Get a real organization from the database
      const org = await prisma.organization.findFirst();
      if (org) {
        return {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: UserRole.ADMIN,
          organizationId: org.id,
        };
      }
    } catch (error) {
      console.error("Error fetching organization for DISABLE_AUTH:", error);
    }
    // Fallback if no organization found
    return {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: UserRole.ADMIN,
      organizationId: "test-org-id",
    };
  }

  try {
    const session = await auth();

    if (!session?.user) {
      return null;
    }

    let orgId = (session.user as any).organizationId as string | undefined;

    if (!orgId && session.user.email) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: session.user.email, mode: "insensitive" } },
        });
        if (dbUser?.organizationId) {
          orgId = dbUser.organizationId;
        } else {
          const firstOrg = await prisma.organization.findFirst();
          if (firstOrg) {
            orgId = firstOrg.id;
            if (dbUser) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { organizationId: firstOrg.id },
              });
            }
          }
        }
      } catch (dbError) {
        console.warn("Could not query organizationId from DB in getCurrentUser:", dbError);
      }
    }

    if (!orgId) {
      try {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
        }
      } catch (e) {
        console.warn("Could not find fallback organization:", e);
      }
    }

    return {
      id: (session.user.id || "user-id") as string,
      email: (session.user.email || "") as string,
      name: (session.user.name || "") as string,
      role: ((session.user as any).role || UserRole.ADMIN) as UserRole,
      organizationId: (orgId || "") as string,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  // Temporarily disable auth for testing
  if (DISABLE_AUTH) {
    try {
      // Get a real organization from the database
      const org = await prisma.organization.findFirst();
      if (org) {
        return {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: UserRole.ADMIN,
          organizationId: org.id,
        };
      }
    } catch (error) {
      console.error("Error fetching organization for DISABLE_AUTH:", error);
    }
    // Fallback if no organization found
    return {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: UserRole.ADMIN,
      organizationId: "test-org-id",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require specific role - redirects to unauthorized if role doesn't match
 */
export async function requireRole(role: UserRole | UserRole[]) {
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

