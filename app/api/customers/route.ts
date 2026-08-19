import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().optional(),
  prepaidCredit: z.number().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List customers
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.error("No user found in customer GET request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching customers for organizationId:", user.organizationId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = {
      organizationId: user.organizationId,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ]
        : undefined,
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          invoices: {
            select: {
              status: true,
              total: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST - Create customer
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        organizationId: user.organizationId,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        billingAddress: validatedData.billingAddress || Prisma.JsonNull,
        shippingAddress: validatedData.shippingAddress || Prisma.JsonNull,
        paymentTerms: validatedData.paymentTerms || "Net 30",
        creditLimit: validatedData.creditLimit || 0,
        prepaidCredit: validatedData.prepaidCredit !== undefined ? validatedData.prepaidCredit : 0,
        taxId: validatedData.taxId || null,
        notes: validatedData.notes || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

