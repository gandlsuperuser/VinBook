import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.record(z.string(), z.any()).optional().nullable(),
  isActive: z.boolean().optional(),
});

// PATCH - Update user profile, role, or permissions
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if target user belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your organization." }, { status: 404 });
    }

    // Only Admin can update other users' roles/permissions/status
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== targetUser.id) {
      return NextResponse.json(
        { error: "Only administrators can modify other team members." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Prevent deactivating or demoting yourself if you are the last admin
    if (currentUser.id === targetUser.id && (validatedData.isActive === false || (validatedData.role && validatedData.role !== UserRole.ADMIN))) {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: currentUser.organizationId,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate or demote the only active Administrator." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name.trim();
    if (validatedData.role && currentUser.role === UserRole.ADMIN) updateData.role = validatedData.role;
    if (validatedData.permissions !== undefined && currentUser.role === UserRole.ADMIN) {
      updateData.permissions = validatedData.permissions;
    }
    if (validatedData.isActive !== undefined && currentUser.role === UserRole.ADMIN) {
      updateData.isActive = validatedData.isActive;
    }
    if (validatedData.password && validatedData.password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(validatedData.password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Error updating team user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user from organization
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Only administrators can remove team members." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account from here." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your organization." }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "User removed successfully." });
  } catch (error) {
    console.error("Error deleting team user:", error);
    return NextResponse.json(
      { error: "Failed to remove user." },
      { status: 500 }
    );
  }
}
