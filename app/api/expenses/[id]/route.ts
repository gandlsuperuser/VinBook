import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { ExpenseStatus, PaymentMethod } from "@prisma/client";

const expenseSchema = z.object({
  vendorId: z.string().optional(),
  date: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().optional(),
  description: z.string().optional(),
  receipt: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(ExpenseStatus),
  notes: z.string().optional(),
});

// GET - Get single expense
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

    const expense = await prisma.expense.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        vendor: true,
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

// PUT - Update expense
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
    const validatedData = expenseSchema.parse(body);

    // Check if expense exists
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    const expense = await prisma.expense.update({
      where: { id: id },
      data: {
        vendorId: validatedData.vendorId || null,
        date: new Date(validatedData.date),
        amount: validatedData.amount,
        category: validatedData.category || null,
        description: validatedData.description || null,
        receipt: validatedData.receipt || null,
        paymentMethod: validatedData.paymentMethod,
        status: validatedData.status,
        notes: validatedData.notes || null,
      },
      include: {
        vendor: true,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
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

    // Check if expense exists
    const expense = await prisma.expense.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}



