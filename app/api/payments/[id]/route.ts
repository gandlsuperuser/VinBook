import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { PaymentMethod, PaymentStatus, InvoiceStatus } from "@prisma/client";

const paymentUpdateSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Get single payment
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

    const payment = await prisma.payment.findFirst({
      where: {
        id: id,
        invoice: {
          organizationId: user.organizationId,
        },
      },
      include: {
        invoice: {
          include: {
            customer: true,
            payments: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

// PUT - Update payment
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
    const validatedData = paymentUpdateSchema.parse(body);

    // Get payment with invoice
    const existingPayment = await prisma.payment.findFirst({
      where: {
        id: id,
        invoice: {
          organizationId: user.organizationId,
        },
      },
      include: {
        invoice: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Calculate total paid excluding this payment
    const otherPaymentsTotal = existingPayment.invoice.payments
      .filter((p) => p.id !== id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const newTotalPaid = otherPaymentsTotal + Number(validatedData.amount);
    const invoiceTotal = Number(existingPayment.invoice.total);

    // Validate that new total doesn't exceed invoice total
    if (newTotalPaid > invoiceTotal) {
      return NextResponse.json(
        { error: "Payment amount would exceed invoice total" },
        { status: 400 }
      );
    }

    // Update payment
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        amount: validatedData.amount,
        date: new Date(validatedData.date),
        method: validatedData.method,
        reference: validatedData.reference || null,
        notes: validatedData.notes || null,
      },
    });

    // Update invoice status based on new total paid
    let newStatus = existingPayment.invoice.status;
    if (newTotalPaid >= invoiceTotal) {
      newStatus = InvoiceStatus.PAID;
    } else if (newTotalPaid > 0) {
      newStatus = InvoiceStatus.PARTIAL;
    } else {
      newStatus = InvoiceStatus.SENT;
    }

    await prisma.invoice.update({
      where: { id: existingPayment.invoiceId },
      data: { status: newStatus },
    });

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete payment
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

    // Get payment with invoice
    const payment = await prisma.payment.findFirst({
      where: {
        id: id,
        invoice: {
          organizationId: user.organizationId,
        },
      },
      include: {
        invoice: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const invoiceId = payment.invoiceId;

    // Delete payment
    await prisma.payment.delete({
      where: { id },
    });

    // Recalculate invoice status
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const invoiceTotal = Number(invoice.total);

      let newStatus = invoice.status;
      if (totalPaid >= invoiceTotal) {
        newStatus = InvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = InvoiceStatus.PARTIAL;
      } else {
        newStatus = InvoiceStatus.SENT;
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}



