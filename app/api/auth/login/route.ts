import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { compare } from "bcryptjs";
import { createSessionToken, setSessionCookie } from "@/lib/jwt";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const cleanEmail = email.trim().toLowerCase();

    // Find user in database
    const user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      include: { organization: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Auto-heal organization if missing
    let organizationId = user.organizationId;
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst();
      if (defaultOrg) {
        organizationId = defaultOrg.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: defaultOrg.id },
        });
      }
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name || "User",
      role: user.role,
      organizationId,
    };

    // Create 30-day JWT session token
    const token = await createSessionToken(payload);

    const response = NextResponse.json({
      success: true,
      user: payload,
      organization: user.organization?.name || "Default Organization",
    });

    // Set secure HTTP-only cookie
    setSessionCookie(response, token);

    return response;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An error occurred while signing in. Please try again." },
      { status: 500 }
    );
  }
}
