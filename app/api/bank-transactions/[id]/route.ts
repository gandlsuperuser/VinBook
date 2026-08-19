import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";

// GET - Get single bank transaction
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

    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: id,
        bankAccount: {
          organizationId: user.organizationId,
        },
      },
      include: {
        bankAccount: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Bank transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error fetching bank transaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank transaction" },
      { status: 500 }
    );
  }
}

// PATCH - Update match status or match with payment/expense
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
    const { matched, matchedId } = body;

    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: id,
        bankAccount: {
          organizationId: user.organizationId,
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Bank transaction not found" },
        { status: 404 }
      );
    }

    // If matching, verify matchedId belongs to organization (if provided)
    if (matched && matchedId) {
      // Verify it's either a payment or expense in this organization
      const payment = await prisma.payment.findFirst({
        where: {
          id: matchedId,
          invoice: {
            organizationId: user.organizationId,
          },
        },
      });

      const expense = await prisma.expense.findFirst({
        where: {
          id: matchedId,
          organizationId: user.organizationId,
        },
      });

      if (!payment && !expense) {
        return NextResponse.json(
          { error: "Matched record not found" },
          { status: 404 }
        );
      }
    }

    const updatedTransaction = await prisma.bankTransaction.update({
      where: { id: id },
      data: {
        matched: matched !== undefined ? matched : true,
        matchedId: matchedId || null,
      },
      include: {
        bankAccount: true,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating bank transaction:", error);
    return NextResponse.json(
      { error: "Failed to update bank transaction" },
      { status: 500 }
    );
  }
}

// DELETE - Delete bank transaction
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

    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: id,
        bankAccount: {
          organizationId: user.organizationId,
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Bank transaction not found" },
        { status: 404 }
      );
    }

    await prisma.bankTransaction.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting bank transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete bank transaction" },
      { status: 500 }
    );
  }
}


