import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { EstimateStatus } from "@prisma/client";

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

    // Fetch the original estimate
    const originalEstimate = await prisma.estimate.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!originalEstimate) {
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    // Generate next estimate number
    const lastEstimate = await prisma.estimate.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    let estimateNumber = "EST-001";
    if (lastEstimate) {
      const lastNumber = parseInt(lastEstimate.number.split("-")[1] || "0");
      estimateNumber = `EST-${String(lastNumber + 1).padStart(3, "0")}`;
    }

    // Calculate dates
    const now = new Date();
    let expiryDate: Date | null = null;
    if (originalEstimate.expiryDate && originalEstimate.date) {
      const diffTime = Math.abs(originalEstimate.expiryDate.getTime() - originalEstimate.date.getTime());
      expiryDate = new Date(now.getTime() + diffTime);
    } else {
      expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    // Create duplicated estimate
    const newEstimate = await prisma.estimate.create({
      data: {
        organizationId: user.organizationId,
        number: estimateNumber,
        customerId: originalEstimate.customerId,
        date: now,
        expiryDate: expiryDate,
        status: EstimateStatus.DRAFT,
        subtotal: originalEstimate.subtotal,
        tax: originalEstimate.tax,
        discount: originalEstimate.discount,
        total: originalEstimate.total,
        convertedToInvoice: false,
        convertedInvoiceId: null,
        notes: originalEstimate.notes,
        terms: originalEstimate.terms,
        items: {
          create: originalEstimate.items.map((item, index) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            tax: item.tax,
            order: item.order ?? index,
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

    return NextResponse.json(newEstimate, { status: 201 });
  } catch (error) {
    console.error("Error duplicating estimate:", error);
    return NextResponse.json(
      { error: "Failed to duplicate estimate" },
      { status: 500 }
    );
  }
}
