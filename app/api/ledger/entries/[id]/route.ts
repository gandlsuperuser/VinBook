import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";

// GET - Get ledger entry
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

    const entry = await prisma.ledgerEntry.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
      include: {
        account: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Ledger entry not found" },
        { status: 404 }
      );
    }

    // If this is part of a journal entry, get all related entries
    let relatedEntries: any[] = [];
    if (entry.reference === "JOURNAL" && entry.referenceId) {
      relatedEntries = await prisma.ledgerEntry.findMany({
        where: {
          referenceId: entry.referenceId,
          organizationId: user.organizationId,
        },
        include: {
          account: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json({ entry, relatedEntries });
  } catch (error) {
    console.error("Error fetching ledger entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger entry" },
      { status: 500 }
    );
  }
}

// DELETE - Delete journal entry (only manual entries)
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

    const entry = await prisma.ledgerEntry.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Ledger entry not found" },
        { status: 404 }
      );
    }

    // Only allow deleting manual journal entries
    if (entry.reference !== "JOURNAL") {
      return NextResponse.json(
        {
          error:
            "Cannot delete automatic ledger entries. They are linked to invoices, payments, or expenses.",
        },
        { status: 400 }
      );
    }

    // Delete all related entries if it's a journal entry
    if (entry.referenceId) {
      await prisma.ledgerEntry.deleteMany({
        where: {
          referenceId: entry.referenceId,
          organizationId: user.organizationId,
        },
      });
    } else {
      await prisma.ledgerEntry.delete({
        where: { id: id },
      });
    }

    return NextResponse.json({ message: "Ledger entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting ledger entry:", error);
    return NextResponse.json(
      { error: "Failed to delete ledger entry" },
      { status: 500 }
    );
  }
}



