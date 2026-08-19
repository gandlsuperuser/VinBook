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
  openingBalance: z.number().default(0),
  openingDate: z.string(),
});

// GET - List bank accounts
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.bankAccount.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Calculate current balance for each account
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await prisma.bankTransaction.findMany({
          where: { bankAccountId: account.id },
        });

        const balance =
          Number(account.balance) +
          transactions.reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          ...account,
          currentBalance: balance,
        };
      })
    );

    return NextResponse.json({ accounts: accountsWithBalance });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}

// POST - Create bank account
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bankAccountSchema.parse(body);

    const account = await prisma.bankAccount.create({
      data: {
        organizationId: user.organizationId,
        name: validatedData.name,
        type: validatedData.type,
        accountNumber: validatedData.accountNumber || null,
        bankName: validatedData.bankName || null,
        balance: validatedData.openingBalance,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating bank account:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}


