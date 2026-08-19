import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { TransactionType } from "@prisma/client";

const transactionSchema = z.object({
  bankAccountId: z.string().min(1, "Bank account is required"),
  date: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  type: z.nativeEnum(TransactionType),
  reference: z.string().optional(),
  matched: z.boolean().optional(),
  matchedId: z.string().optional(),
});

// GET - List bank transactions
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get("bankAccountId") || "";
    const matched = searchParams.get("matched");
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      bankAccount: {
        organizationId: user.organizationId,
      },
    };

    if (bankAccountId) {
      where.bankAccountId = bankAccountId;
    }

    if (matched !== null && matched !== undefined) {
      where.matched = matched === "true";
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

    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          bankAccount: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bank transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank transactions" },
      { status: 500 }
    );
  }
}

// POST - Create bank transaction
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transactionSchema.parse(body);

    // Verify bank account belongs to organization
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: validatedData.bankAccountId,
        organizationId: user.organizationId,
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId: validatedData.bankAccountId,
        date: new Date(validatedData.date),
        amount: validatedData.amount,
        description: validatedData.description || "",
        type: validatedData.type,
        reference: validatedData.reference || null,
        matched: validatedData.matched || false,
        matchedId: validatedData.matchedId || null,
      },
      include: {
        bankAccount: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating bank transaction:", error);
    return NextResponse.json(
      { error: "Failed to create bank transaction" },
      { status: 500 }
    );
  }
}


