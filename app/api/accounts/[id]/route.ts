import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { AccountType } from "@prisma/client";

const accountSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  type: z.nativeEnum(AccountType),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - Get single account with balance
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
    const account = await prisma.ledgerAccount.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { code: "asc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Calculate balance
    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: id },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        account: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    const balance = entries.reduce((sum, entry) => {
      return sum + Number(entry.debit) - Number(entry.credit);
    }, 0);

    // Calculate total balance including children
    let totalBalance = balance;
    if (account.children.length > 0) {
      const childBalances = await Promise.all(
        account.children.map(async (child) => {
          const childEntries = await prisma.ledgerEntry.findMany({
            where: { accountId: child.id },
          });
          return childEntries.reduce((sum, entry) => {
            return sum + Number(entry.debit) - Number(entry.credit);
          }, 0);
        })
      );
      totalBalance += childBalances.reduce((sum, bal) => sum + bal, 0);
    }

    return NextResponse.json({
      ...account,
      balance,
      totalBalance,
      entries,
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// PUT - Update account
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
    const validatedData = accountSchema.parse(body);

    // Check if account exists
    const existingAccount = await prisma.ledgerAccount.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Don't allow editing system accounts
    if (existingAccount.isSystem) {
      return NextResponse.json(
        { error: "Cannot edit system accounts" },
        { status: 400 }
      );
    }

    // Check if code already exists (for different account)
    if (validatedData.code !== existingAccount.code) {
      const codeExists = await prisma.ledgerAccount.findUnique({
        where: {
          organizationId_code: {
            organizationId: user.organizationId,
            code: validatedData.code,
          },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Account code already exists" },
          { status: 400 }
        );
      }
    }

    const account = await prisma.ledgerAccount.update({
      where: { id },
      data: {
        code: validatedData.code,
        name: validatedData.name,
        type: validatedData.type,
        parentId: validatedData.parentId || null,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        parent: true,
        children: true,
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
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

// DELETE - Delete account (deactivate instead of delete)
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
    // Check if account exists
    const account = await prisma.ledgerAccount.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        entries: true,
        children: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting system accounts
    if (account.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system accounts" },
        { status: 400 }
      );
    }

    // Check if account has entries
    if (account.entries.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete account with ledger entries. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    // Check if account has children
    if (account.children.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete account with sub-accounts. Please delete or move sub-accounts first.",
        },
        { status: 400 }
      );
    }

    await prisma.ledgerAccount.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}


