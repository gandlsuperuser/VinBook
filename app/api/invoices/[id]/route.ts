import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { deductInventoryForInvoice, restoreInventoryForInvoice } from "@/lib/inventory";

const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string(),
  dueDate: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
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

// GET - Get single invoice
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        organization: true,
        customer: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        payments: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Calculate paid amount
    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    return NextResponse.json({
      ...invoice,
      paidAmount,
      remainingAmount: Number(invoice.total) - paidAmount,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PUT - Update invoice
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await request.json();
    const validatedData = invoiceSchema.parse(body);

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        payments: true,
        items: true,
        customer: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Allow editing paid invoices in case payment didn't go through

    // If status is being changed to PAID, automatically create payment if needed
    if (validatedData.status === InvoiceStatus.PAID && existingInvoice.status !== InvoiceStatus.PAID) {
      const totalPaid = existingInvoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const invoiceTotal = Number(validatedData.total);
      const remaining = invoiceTotal - totalPaid;

      // If there's a remaining balance, create a payment for it
      if (remaining > 0) {
        await prisma.payment.create({
          data: {
            invoiceId: id,
            amount: remaining,
            date: new Date(),
            method: PaymentMethod.CASH,
            status: PaymentStatus.COMPLETED,
            notes: "Auto-generated payment when invoice marked as paid",
          },
        });
      }
    }

    // Restore previous items inventory before applying update
    if (existingInvoice.items && existingInvoice.items.length > 0) {
      await restoreInventoryForInvoice({
        organizationId: user.organizationId,
        invoiceNumber: existingInvoice.number,
        customerName: existingInvoice.customer?.name,
        performedBy: user.name || user.email,
        items: existingInvoice.items,
      });
    }

    // Update invoice
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: {
        customerId: validatedData.customerId,
        date: new Date(validatedData.date),
        dueDate: new Date(validatedData.dueDate),
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

    // Deduct inventory for updated items
    await deductInventoryForInvoice({
      organizationId: user.organizationId,
      invoiceNumber: invoice.number,
      customerName: invoice.customer?.name,
      performedBy: user.name || user.email,
      items: validatedData.items,
    });

    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// PATCH - Update invoice status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(InvoiceStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Fetch invoice with payments to check current state
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        payments: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // If status is being changed to PAID, automatically create payment if needed
    if (status === InvoiceStatus.PAID && existingInvoice.status !== InvoiceStatus.PAID) {
      const totalPaid = existingInvoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const invoiceTotal = Number(existingInvoice.total);
      const remaining = invoiceTotal - totalPaid;

      // If there's a remaining balance, create a payment for it
      if (remaining > 0) {
        await prisma.payment.create({
          data: {
            invoiceId: id,
            amount: remaining,
            date: new Date(),
            method: PaymentMethod.CASH,
            status: PaymentStatus.COMPLETED,
            notes: "Auto-generated payment when invoice marked as paid",
          },
        });
      }
    }

    // Update invoice status
    const invoice = await prisma.invoice.update({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      data: { status },
      include: {
        payments: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json(
      { error: "Failed to update invoice status" },
      { status: 500 }
    );
  }
}

// DELETE - Delete invoice
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // Check if invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        payments: true,
        items: true,
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check if invoice has payments
    if (invoice.payments.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete invoice with existing payments. Please delete payments first.",
        },
        { status: 400 }
      );
    }

    // Restore product inventory
    await restoreInventoryForInvoice({
      organizationId: user.organizationId,
      invoiceNumber: invoice.number,
      customerName: invoice.customer?.name,
      performedBy: user.name || user.email,
      items: invoice.items,
    });

    // Delete invoice (items and payments will be cascade deleted)
    await prisma.invoice.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}

