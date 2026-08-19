import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";

const ledgerEntrySchema = z.object({
  date: z.string(),
  description: z.string().min(1, "Description is required"),
  entries: z
    .array(
      z.object({
        accountId: z.string().min(1, "Account is required"),
        debit: z.number().min(0),
        credit: z.number().min(0),
      })
    )
    .min(2, "At least two entries are required"),
});

// GET - List ledger entries
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: user.organizationId,
    };

    if (accountId) {
      where.accountId = accountId;
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

    if (search) {
      where.description = { contains: search, mode: "insensitive" as const };
    }

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger entries" },
      { status: 500 }
    );
  }
}

// POST - Create manual journal entry
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ledgerEntrySchema.parse(body);

    // Validate debits = credits
    const totalDebits = validatedData.entries.reduce(
      (sum, entry) => sum + entry.debit,
      0
    );
    const totalCredits = validatedData.entries.reduce(
      (sum, entry) => sum + entry.credit,
      0
    );

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: "Total debits must equal total credits" },
        { status: 400 }
      );
    }

    // Verify all accounts belong to organization
    const accountIds = validatedData.entries.map((e) => e.accountId);
    const accounts = await prisma.ledgerAccount.findMany({
      where: {
        id: { in: accountIds },
        organizationId: user.organizationId,
      },
    });

    if (accounts.length !== accountIds.length) {
      return NextResponse.json(
        { error: "One or more accounts not found" },
        { status: 400 }
      );
    }

    // Create ledger entries
    const reference = `JOURNAL-${Date.now()}`;
    const entries = await Promise.all(
      validatedData.entries.map((entry) =>
        prisma.ledgerEntry.create({
          data: {
            organizationId: user.organizationId,
            accountId: entry.accountId,
            date: new Date(validatedData.date),
            debit: entry.debit,
            credit: entry.credit,
            description: validatedData.description,
            reference: "JOURNAL",
            referenceId: reference,
          },
          include: {
            account: true,
          },
        })
      )
    );

    return NextResponse.json({ entries, reference }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating ledger entry:", error);
    return NextResponse.json(
      { error: "Failed to create ledger entry" },
      { status: 500 }
    );
  }
}



