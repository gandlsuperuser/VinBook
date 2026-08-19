import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  paymentTerms: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Get single vendor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        expenses: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Calculate outstanding balance from unpaid expenses
    const unpaidExpenses = vendor.expenses.filter(
      (exp) => exp.status !== "PAID" && exp.status !== "REIMBURSED"
    );
    const outstandingBalance = unpaidExpenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    return NextResponse.json({
      ...vendor,
      outstandingBalance,
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
      { status: 500 }
    );
  }
}

// PUT - Update vendor
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = vendorSchema.parse(body);

    // Check if vendor exists and belongs to organization
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || Prisma.JsonNull,
        paymentTerms: validatedData.paymentTerms || "Net 30",
        taxId: validatedData.taxId || null,
        notes: validatedData.notes || null,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

// DELETE - Delete vendor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Check if vendor exists and belongs to organization
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        expenses: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Check if vendor has expenses
    if (vendor.expenses.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete vendor with existing expenses. Please delete or transfer expenses first.",
        },
        { status: 400 }
      );
    }

    await prisma.vendor.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}


