import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { PaymentMethod, PaymentStatus, InvoiceStatus } from "@prisma/client";

const paymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// POST - Record payment
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

    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    // Check if invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Calculate total paid
    const totalPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const remaining = Number(invoice.total) - totalPaid;

    if (validatedData.amount > remaining) {
      return NextResponse.json(
        { error: "Payment amount exceeds remaining balance" },
        { status: 400 }
      );
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: validatedData.amount,
        date: new Date(validatedData.date),
        method: validatedData.method,
        reference: validatedData.reference || null,
        status: PaymentStatus.COMPLETED,
        notes: validatedData.notes || null,
      },
    });

    // Update invoice status
    const newTotalPaid = totalPaid + Number(validatedData.amount);
    let newStatus = invoice.status;

    if (newTotalPaid >= Number(invoice.total)) {
      newStatus = "PAID" as InvoiceStatus;
    } else if (newTotalPaid > 0) {
      newStatus = "PARTIAL" as InvoiceStatus;
    }

    await prisma.invoice.update({
      where: { id: id },
      data: { status: newStatus },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}

