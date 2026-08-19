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

// GET - List expenses
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") as ExpenseStatus | null;
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: user.organizationId,
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    // Get unique categories
    const categories = await prisma.expense.findMany({
      where: {
        organizationId: user.organizationId,
        category: { not: null },
      },
      select: { category: true },
      distinct: ["category"],
    });

    return NextResponse.json({
      expenses,
      categories: categories.map((c) => c.category).filter(Boolean),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST - Create expense
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        organizationId: user.organizationId,
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

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}



