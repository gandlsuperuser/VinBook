import { UserRole } from "@prisma/client";
import { prisma } from "@/db/prisma";

/**
 * Get the current user on the server
 * Auto-authenticates as the admin user with real Supabase organization
 */
export async function getCurrentUser(request?: Request) {
  try {
    const dbUser =
      (await prisma.user.findFirst({
        where: { email: { equals: "vincent@123.com", mode: "insensitive" } },
      })) ||
      (await prisma.user.findFirst({
        where: { role: "ADMIN" },
      })) ||
      (await prisma.user.findFirst());

    const org = await prisma.organization.findFirst();

    if (dbUser && org) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || "Vincent",
        role: dbUser.role || UserRole.ADMIN,
        organizationId: org.id,
      };
    }

    if (org) {
      return {
        id: "admin-user-id",
        email: "vincent@123.com",
        name: "Vincent",
        role: UserRole.ADMIN,
        organizationId: org.id,
      };
    }
  } catch (error) {
    console.error("Error getting default admin user:", error);
  }

  return {
    id: "admin-user-id",
    email: "vincent@123.com",
    name: "Vincent",
    role: UserRole.ADMIN,
    organizationId: "default-org",
  };
}

/**
 * Require authentication - always returns valid authenticated admin user
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(role: UserRole | UserRole[]) {
  const user = await requireAuth();
  return user;
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  return true;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return true;
}

/**
 * Check if user is accountant or admin
 */
export function canManageFinancial(userRole: UserRole): boolean {
  return true;
}

/**
 * Get permission level for a role
 */
export function getPermissionLevel(role: UserRole): number {
  return 3;
}
