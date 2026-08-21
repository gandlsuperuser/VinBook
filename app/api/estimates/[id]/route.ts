import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { EstimateStatus, InvoiceStatus } from "@prisma/client";
import { deductInventoryForInvoice } from "@/lib/inventory";

const estimateItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).optional(),
});

const estimateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string(),
  expiryDate: z.string().optional(),
  status: z.nativeEnum(EstimateStatus),
  items: z.array(estimateItemSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  total: z.coerce.number().min(0),
  poNumber: z.string().optional(),
  sideMark: z.string().optional(),
  salesRep: z.string().optional(),
  shipTo: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

// GET - Get single estimate
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

    const estimate = await prisma.estimate.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        customer: true,
        organization: true,
        items: {
          include: {
            product: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error("Error fetching estimate:", error);
    return NextResponse.json(
      { error: "Failed to fetch estimate" },
      { status: 500 }
    );
  }
}

// PUT - Update estimate
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }
    const { id } = await params;

    const body = await request.json();
    const validatedData = estimateSchema.parse(body);

    let organizationId = user.organizationId;
    if (!organizationId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true },
      });
      organizationId = dbUser?.organizationId || "";
    }

    if (!organizationId) {
      return NextResponse.json({ error: "User organization not found" }, { status: 400 });
    }

    // Check if estimate exists
    const existingEstimate = await prisma.estimate.findFirst({
      where: {
        id: id,
        organizationId,
      },
    });

    if (!existingEstimate) {
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    // Don't allow editing converted estimates
    if (existingEstimate.convertedToInvoice) {
      return NextResponse.json(
        { error: "Cannot edit estimate that has already been converted to an invoice" },
        { status: 400 }
      );
    }

    // Update estimate
    await prisma.estimateItem.deleteMany({
      where: { estimateId: id },
    });

    const estimate = await prisma.estimate.update({
      where: { id: id },
      data: {
        customerId: validatedData.customerId,
        date: new Date(validatedData.date),
        expiryDate: validatedData.expiryDate
          ? new Date(validatedData.expiryDate)
          : null,
        status: validatedData.status,
        subtotal: validatedData.subtotal,
        tax: validatedData.tax,
        discount: validatedData.discount || 0,
        total: validatedData.total,
        poNumber: validatedData.poNumber || null,
        sideMark: validatedData.sideMark || null,
        salesRep: validatedData.salesRep || null,
        shipTo: validatedData.shipTo || null,
        notes: validatedData.notes || null,
        terms: validatedData.terms || null,
        items: {
          create: validatedData.items.map((item, index) => ({
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            tax: item.tax || 0,
            order: index,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(estimate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        const field = issue.path.join(" -> ") || "form";
        return `[${field}]: ${issue.message}`;
      });
      return NextResponse.json(
        { error: `Validation Error on ${issues.join(", ")}` },
        { status: 400 }
      );
    }
    console.error("Error updating estimate:", error);
    const msg = (error as any)?.message || "Failed to update estimate";
    return NextResponse.json(
      { error: `Unable to update estimate: ${msg}` },
      { status: 500 }
    );
  }
}

// POST - Convert estimate to invoice
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // Get estimate
    const estimate = await prisma.estimate.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        items: true,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    if (estimate.convertedToInvoice) {
      return NextResponse.json(
        { error: "Estimate already converted to invoice" },
        { status: 400 }
      );
    }

    // Generate invoice number (starts at 99-1001, then 99-1002...)
    const existingInvoices = await prisma.invoice.findMany({
      where: { organizationId: user.organizationId },
      select: { number: true },
    });

    let nextNumber = 1001;
    for (const inv of existingInvoices) {
      const match = inv.number.match(/^99-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= nextNumber) {
          nextNumber = num + 1;
        }
      }
    }
    const invoiceNumber = `99-${nextNumber}`;

    // Calculate due date (30 days from now or use estimate expiry date)
    const dueDate = estimate.expiryDate
      ? estimate.expiryDate
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create invoice from estimate
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: user.organizationId,
        number: invoiceNumber,
        customerId: estimate.customerId,
        date: new Date(),
        dueDate: dueDate,
        status: InvoiceStatus.DRAFT,
        subtotal: estimate.subtotal,
        tax: estimate.tax,
        discount: estimate.discount,
        total: estimate.total,
        poNumber: estimate.poNumber,
        sideMark: estimate.sideMark,
        salesRep: estimate.salesRep,
        shipTo: estimate.shipTo,
        notes: estimate.notes,
        terms: estimate.terms,
        items: {
          create: estimate.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            tax: item.tax,
            order: item.order,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Deduct stock for all tracked items
    await deductInventoryForInvoice({
      organizationId: user.organizationId,
      invoiceNumber: invoice.number,
      customerName: invoice.customer?.name,
      performedBy: user.name || user.email,
      items: estimate.items,
    });

    // Mark estimate as converted
    await prisma.estimate.update({
      where: { id: id },
      data: {
        convertedToInvoice: true,
        convertedInvoiceId: invoice.id,
        status: EstimateStatus.ACCEPTED,
      },
    });

    return NextResponse.json({ invoice, estimateId: id });
  } catch (error) {
    console.error("Error converting estimate:", error);
    return NextResponse.json(
      { error: "Failed to convert estimate" },
      { status: 500 }
    );
  }
}

// PATCH - Update estimate status
export async function PATCH(
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

    if (!body.status || !Object.values(EstimateStatus).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existingEstimate = await prisma.estimate.findFirst({
      where: { id: id, organizationId: user.organizationId },
    });

    if (!existingEstimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const updated = await prisma.estimate.update({
      where: { id: id },
      data: { status: body.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating estimate status:", error);
    return NextResponse.json({ error: "Failed to update estimate status" }, { status: 500 });
  }
}

// DELETE - Delete estimate
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

    const existingEstimate = await prisma.estimate.findFirst({
      where: { id: id, organizationId: user.organizationId },
    });

    if (!existingEstimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    await prisma.estimate.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Estimate deleted successfully" });
  } catch (error) {
    console.error("Error deleting estimate:", error);
    return NextResponse.json({ error: "Failed to delete estimate" }, { status: 500 });
  }
}



