import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { hash } from "bcryptjs";
import { createSessionToken, setSessionCookie } from "@/lib/jwt";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName } = signupSchema.parse(body);

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    // Create organization
    const orgName = companyName?.trim() || `${name}'s Company`;
    const slug =
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + `-${Date.now()}`;

    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
      },
    });

    // Create settings for organization
    await prisma.settings.create({
      data: {
        organizationId: organization.id,
        taxSettings: { defaultTaxRate: 0, taxInclusive: false },
        invoiceSettings: { prefix: "INV", numberFormat: "00000", defaultTerms: "Net 30" },
        currency: "USD",
        timezone: "UTC",
        fiscalYearStart: "01-01",
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "ADMIN",
        organizationId: organization.id,
      },
    });

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name || name,
      role: user.role,
      organizationId: organization.id,
    };

    const token = await createSessionToken(payload);

    const response = NextResponse.json(
      {
        success: true,
        user: payload,
        organization: organization.name,
      },
      { status: 201 }
    );

    setSessionCookie(response, token);

    return response;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
