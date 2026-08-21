import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Query PostgreSQL actual database size in bytes
    const dbSizeResult: any[] = await prisma.$queryRaw`
      SELECT pg_database_size(current_database())::text AS db_size_bytes;
    `;

    const dbSizeBytes = dbSizeResult?.[0]?.db_size_bytes
      ? parseInt(dbSizeResult[0].db_size_bytes, 10)
      : 0;

    // 2. Query individual table size breakdown
    let tableBreakdown: any[] = [];
    try {
      const tablesResult: any[] = await prisma.$queryRaw`
        SELECT
          relname AS table_name,
          pg_total_relation_size(relid)::text AS total_bytes,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          n_live_tup::int AS estimated_rows
        FROM pg_catalog.pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10;
      `;

      tableBreakdown = tablesResult.map((t) => ({
        tableName: t.table_name,
        bytes: parseInt(t.total_bytes, 10) || 0,
        prettySize: t.total_size,
        rows: t.estimated_rows || 0,
      }));
    } catch (tblErr) {
      console.warn("Could not query table sizes:", tblErr);
    }

    // 3. Organization record count
    const orgId = user.organizationId;
    const [
      invoiceCount,
      customerCount,
      productCount,
      expenseCount,
      estimateCount,
      paymentCount,
      ledgerCount,
      inventoryLogCount,
      bankAccountCount,
    ] = await Promise.all([
      prisma.invoice.count({ where: { organizationId: orgId } }),
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.product.count({ where: { organizationId: orgId } }),
      prisma.expense.count({ where: { organizationId: orgId } }),
      prisma.estimate.count({ where: { organizationId: orgId } }),
      prisma.payment.count({ where: { invoice: { organizationId: orgId } } }),
      prisma.ledgerEntry.count({ where: { organizationId: orgId } }),
      prisma.inventoryLog.count({ where: { organizationId: orgId } }),
      prisma.bankAccount.count({ where: { organizationId: orgId } }),
    ]);

    // 4. Supabase Quota calculation (Default 500MB Free tier limit, configurable)
    const limitMB = parseInt(process.env.SUPABASE_DB_LIMIT_MB || "500", 10);
    const maxBytes = limitMB * 1024 * 1024;
    const usedMB = dbSizeBytes / (1024 * 1024);
    const percentage = Math.min(100, Math.max(0, (dbSizeBytes / maxBytes) * 100));

    let status: "healthy" | "warning" | "critical" = "healthy";
    if (percentage >= 85) {
      status = "critical";
    } else if (percentage >= 70) {
      status = "warning";
    }

    return NextResponse.json({
      usedBytes: dbSizeBytes,
      usedMB: parseFloat(usedMB.toFixed(2)),
      maxMB: limitMB,
      maxBytes,
      percentage: parseFloat(percentage.toFixed(2)),
      status,
      planLabel: `Supabase (${limitMB} MB Quota)`,
      tables: tableBreakdown,
      counts: {
        invoices: invoiceCount,
        customers: customerCount,
        products: productCount,
        expenses: expenseCount,
        estimates: estimateCount,
        payments: paymentCount,
        ledgerEntries: ledgerCount,
        inventoryLogs: inventoryLogCount,
        bankAccounts: bankAccountCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching database usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch database usage metrics", details: error?.message },
      { status: 500 }
    );
  }
}
