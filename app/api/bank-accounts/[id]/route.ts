import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { BankAccountType } from "@prisma/client";

const bankAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.nativeEnum(BankAccountType),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - Get single bank account
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

    const account = await prisma.bankAccount.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    const transactions = await prisma.bankTransaction.findMany({
      where: { bankAccountId: id },
    });

    const currentBalance =
      Number(account.balance) +
      transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return NextResponse.json({
      ...account,
      currentBalance,
    });
  } catch (error) {
    console.error("Error fetching bank account:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank account" },
      { status: 500 }
    );
  }
}

// PUT - Update bank account
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
    const validatedData = bankAccountSchema.parse(body);

    const account = await prisma.bankAccount.update({
      where: { id: id },
      data: {
        name: validatedData.name,
        type: validatedData.type,
        accountNumber: validatedData.accountNumber || null,
        bankName: validatedData.bankName || null,
        isActive: validatedData.isActive ?? true,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating bank account:", error);
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    );
  }
}


