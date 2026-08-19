import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(1, "Organization name is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate organization slug
    const slug = validatedData.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if organization slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this name already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create organization and user
    const organization = await prisma.organization.create({
      data: {
        name: validatedData.organizationName,
        slug,
      },
    });

    await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        organizationId: organization.id,
        role: "ADMIN", // First user is admin
      },
    });

    // Create default settings
    await prisma.settings.create({
      data: {
        organizationId: organization.id,
        taxSettings: {
          defaultTaxRate: 0,
          taxInclusive: false,
        },
        invoiceSettings: {
          prefix: "INV",
          numberFormat: "00000",
          defaultTerms: "Net 30",
        },
        currency: "USD",
        timezone: "UTC",
        fiscalYearStart: "01-01",
      },
    });

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}



