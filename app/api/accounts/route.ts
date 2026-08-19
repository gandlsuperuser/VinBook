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
});

// GET - List accounts (as tree)
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.ledgerAccount.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
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
        _count: {
          select: { entries: true },
        },
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    // Build tree structure
    const accountMap = new Map();
    const rootAccounts: any[] = [];

    // First pass: create map
    accounts.forEach((account) => {
      accountMap.set(account.id, {
        ...account,
        children: [],
        balance: 0, // Will be calculated
      });
    });

    // Second pass: build tree
    accounts.forEach((account) => {
      const accountNode = accountMap.get(account.id);
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children.push(accountNode);
        } else {
          rootAccounts.push(accountNode);
        }
      } else {
        rootAccounts.push(accountNode);
      }
    });

    // Calculate balances
    for (const account of accounts) {
      const entries = await prisma.ledgerEntry.findMany({
        where: { accountId: account.id },
      });

      const balance = entries.reduce((sum, entry) => {
        return sum + Number(entry.debit) - Number(entry.credit);
      }, 0);

      const accountNode = accountMap.get(account.id);
      if (accountNode) {
        accountNode.balance = balance;
      }
    }

    return NextResponse.json({ accounts: rootAccounts, flatAccounts: accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// POST - Create account
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = accountSchema.parse(body);

    // Check if code already exists
    const existingAccount = await prisma.ledgerAccount.findUnique({
      where: {
        organizationId_code: {
          organizationId: user.organizationId,
          code: validatedData.code,
        },
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 400 }
      );
    }

    const account = await prisma.ledgerAccount.create({
      data: {
        organizationId: user.organizationId,
        code: validatedData.code,
        name: validatedData.name,
        type: validatedData.type,
        parentId: validatedData.parentId || null,
      },
      include: {
        parent: true,
        children: true,
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
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

// Default chart of accounts
const DEFAULT_ACCOUNTS = [
  // Assets (1000-1999)
  { code: "1000", name: "Cash", type: AccountType.ASSET },
  { code: "1010", name: "Checking Account", type: AccountType.ASSET },
  { code: "1020", name: "Savings Account", type: AccountType.ASSET },
  { code: "1100", name: "Accounts Receivable", type: AccountType.ASSET },
  { code: "1200", name: "Inventory", type: AccountType.ASSET },
  { code: "1300", name: "Prepaid Expenses", type: AccountType.ASSET },
  { code: "1400", name: "Property, Plant & Equipment", type: AccountType.ASSET },
  { code: "1500", name: "Accumulated Depreciation", type: AccountType.ASSET },
  
  // Liabilities (2000-2999)
  { code: "2000", name: "Accounts Payable", type: AccountType.LIABILITY },
  { code: "2100", name: "Accrued Expenses", type: AccountType.LIABILITY },
  { code: "2200", name: "Short-term Debt", type: AccountType.LIABILITY },
  { code: "2300", name: "Long-term Debt", type: AccountType.LIABILITY },
  { code: "2400", name: "Taxes Payable", type: AccountType.LIABILITY },
  
  // Equity (3000-3999)
  { code: "3000", name: "Owner's Equity", type: AccountType.EQUITY },
  { code: "3100", name: "Retained Earnings", type: AccountType.EQUITY },
  { code: "3200", name: "Capital Contributions", type: AccountType.EQUITY },
  
  // Revenue (4000-4999)
  { code: "4000", name: "Sales Revenue", type: AccountType.REVENUE },
  { code: "4100", name: "Service Revenue", type: AccountType.REVENUE },
  { code: "4200", name: "Other Income", type: AccountType.REVENUE },
  { code: "4300", name: "Interest Income", type: AccountType.REVENUE },
  
  // Expenses (5000-6999)
  { code: "5000", name: "Cost of Goods Sold", type: AccountType.EXPENSE },
  { code: "5100", name: "Inventory Cost", type: AccountType.EXPENSE },
  { code: "6000", name: "Operating Expenses", type: AccountType.EXPENSE },
  { code: "6100", name: "Salaries & Wages", type: AccountType.EXPENSE },
  { code: "6110", name: "Employee Benefits", type: AccountType.EXPENSE },
  { code: "6200", name: "Rent", type: AccountType.EXPENSE },
  { code: "6300", name: "Utilities", type: AccountType.EXPENSE },
  { code: "6400", name: "Marketing & Advertising", type: AccountType.EXPENSE },
  { code: "6500", name: "Office Supplies", type: AccountType.EXPENSE },
  { code: "6600", name: "Professional Services", type: AccountType.EXPENSE },
  { code: "6700", name: "Depreciation", type: AccountType.EXPENSE },
  { code: "6800", name: "Interest Expense", type: AccountType.EXPENSE },
  { code: "6900", name: "Insurance", type: AccountType.EXPENSE },
  { code: "6910", name: "Repairs & Maintenance", type: AccountType.EXPENSE },
  { code: "6920", name: "Travel & Entertainment", type: AccountType.EXPENSE },
  { code: "6930", name: "Taxes & Licenses", type: AccountType.EXPENSE },
  { code: "6940", name: "Bad Debt Expense", type: AccountType.EXPENSE },
  { code: "6950", name: "Other Expenses", type: AccountType.EXPENSE },
];

// POST /api/accounts/initialize - Initialize default accounts
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.action !== "initialize") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Check existing accounts
    const existingAccounts = await prisma.ledgerAccount.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: { code: true },
    });

    const existingCodes = new Set(existingAccounts.map((acc) => acc.code));

    // Only create accounts that don't exist
    const accountsToCreate = DEFAULT_ACCOUNTS.filter(
      (acc) => !existingCodes.has(acc.code)
    );

    if (accountsToCreate.length === 0) {
      return NextResponse.json({
        message: "Default accounts already exist",
        created: 0,
      });
    }

    // Create accounts
    const createdAccounts = await Promise.all(
      accountsToCreate.map((account) =>
        prisma.ledgerAccount.create({
          data: {
            organizationId: user.organizationId,
            code: account.code,
            name: account.name,
            type: account.type,
            isSystem: true,
            isActive: true,
          },
        })
      )
    );

    return NextResponse.json({
      message: `Created ${createdAccounts.length} default accounts`,
      created: createdAccounts.length,
      accounts: createdAccounts,
    });
  } catch (error) {
    console.error("Error initializing accounts:", error);
    return NextResponse.json(
      { error: "Failed to initialize accounts" },
      { status: 500 }
    );
  }
}



