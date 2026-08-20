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

    // Create 25 standard Chart of Accounts for new organization
    const defaultAccounts = [
      { code: "1000", name: "Cash", type: "ASSET" as const },
      { code: "1100", name: "Accounts Receivable", type: "ASSET" as const },
      { code: "1200", name: "Inventory", type: "ASSET" as const },
      { code: "1300", name: "Prepaid Expenses", type: "ASSET" as const },
      { code: "1400", name: "Property, Plant & Equipment", type: "ASSET" as const },
      { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
      { code: "2100", name: "Accrued Expenses", type: "LIABILITY" as const },
      { code: "2200", name: "Short-term Debt", type: "LIABILITY" as const },
      { code: "2300", name: "Long-term Debt", type: "LIABILITY" as const },
      { code: "3000", name: "Owner's Equity", type: "EQUITY" as const },
      { code: "3100", name: "Retained Earnings", type: "EQUITY" as const },
      { code: "4000", name: "Sales Revenue", type: "REVENUE" as const },
      { code: "4100", name: "Service Revenue", type: "REVENUE" as const },
      { code: "4200", name: "Other Income", type: "REVENUE" as const },
      { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
      { code: "6000", name: "Operating Expenses", type: "EXPENSE" as const },
      { code: "6100", name: "Salaries & Wages", type: "EXPENSE" as const },
      { code: "6200", name: "Rent", type: "EXPENSE" as const },
      { code: "6300", name: "Utilities", type: "EXPENSE" as const },
      { code: "6400", name: "Marketing & Advertising", type: "EXPENSE" as const },
      { code: "6500", name: "Office Supplies", type: "EXPENSE" as const },
      { code: "6600", name: "Professional Services", type: "EXPENSE" as const },
      { code: "6700", name: "Depreciation", type: "EXPENSE" as const },
      { code: "6800", name: "Interest Expense", type: "EXPENSE" as const },
      { code: "6900", name: "Other Expenses", type: "EXPENSE" as const },
    ];

    await prisma.ledgerAccount.createMany({
      data: defaultAccounts.map((acc) => ({
        organizationId: organization.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      })),
      skipDuplicates: true,
    });

    // Seed default inventory products for new organization
    const { INVENTORY_CATALOG } = await import("@/lib/inventory-data");
    await prisma.product.createMany({
      data: INVENTORY_CATALOG.map((item) => ({
        organizationId: organization.id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        category: item.category,
        type: item.type,
        price: item.price,
        cost: item.cost,
        inventory: item.inventory,
        unit: item.unit,
        location: item.location,
        isActive: true,
      })),
      skipDuplicates: true,
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
