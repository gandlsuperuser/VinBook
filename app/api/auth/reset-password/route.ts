import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    const email = validatedData.email.trim().toLowerCase();

    // Verify token exists and matches identifier
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: validatedData.token,
        identifier: { equals: email, mode: "insensitive" },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > new Date(verificationToken.expires)) {
      await prisma.verificationToken.delete({
        where: { token: verificationToken.token },
      });
      return NextResponse.json(
        { error: "Password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(validatedData.password);

    // Update user password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: { equals: email, mode: "insensitive" } },
    });

    return NextResponse.json({
      message: "Password has been successfully reset.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Error in reset-password handler:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
