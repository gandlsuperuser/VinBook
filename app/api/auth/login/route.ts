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
    let organizationName = user.organization?.name;

    if (!organizationId) {
      const userName = user.name || user.email.split("@")[0] || "User";
      const slug =
        userName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") + `-${Date.now()}`;

      const newOrg = await prisma.organization.create({
        data: {
          name: `${userName}'s Company`,
          slug,
        },
      });

      await prisma.settings.create({
        data: {
          organizationId: newOrg.id,
          taxSettings: { defaultTaxRate: 0, taxInclusive: false },
          invoiceSettings: { prefix: "INV", numberFormat: "00000", defaultTerms: "Net 30" },
          currency: "USD",
          timezone: "UTC",
          fiscalYearStart: "01-01",
        },
      });

      organizationId = newOrg.id;
      organizationName = newOrg.name;

      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: newOrg.id },
      });
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
      organization: organizationName || "My Company",
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
