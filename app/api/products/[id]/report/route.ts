import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";

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
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Fetch product and organization
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Date filters for queries
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // 1. Fetch all Inventory Logs (When inventory was added, restocked, or adjusted)
    const inventoryLogs = await prisma.inventoryLog.findMany({
      where: {
        productId: id,
        organizationId: user.organizationId,
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all Invoiced Sales & Pickups (When sold to customer, picked up by rep / driver)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        productId: id,
        invoice: {
          organizationId: user.organizationId,
          ...(startDate || endDate ? { date: dateFilter } : {}),
        },
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        invoice: {
          date: "desc",
        },
      },
    });

    // Aggregate Customer Statistics (Who bought / picked up this product)
    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        customerEmail: string | null;
        customerPhone: string | null;
        totalUnits: number;
        totalAmount: number;
        invoiceCount: number;
        lastOrderDate: string;
        salesReps: Set<string>;
      }
    >();

    invoiceItems.forEach((item) => {
      const cust = item.invoice.customer;
      const existing = customerMap.get(cust.id) || {
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email || null,
        customerPhone: cust.phone || null,
        totalUnits: 0,
        totalAmount: 0,
        invoiceCount: 0,
        lastOrderDate: item.invoice.date.toISOString(),
        salesReps: new Set<string>(),
      };

      existing.totalUnits += Number(item.quantity);
      existing.totalAmount += Number(item.amount);
      existing.invoiceCount += 1;
      if (new Date(item.invoice.date) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = item.invoice.date.toISOString();
      }
      if (item.invoice.salesRep) {
        existing.salesReps.add(item.invoice.salesRep);
      }

      customerMap.set(cust.id, existing);
    });

    const topCustomers = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        salesReps: Array.from(c.salesReps),
      }))
      .sort((a, b) => b.totalUnits - a.totalUnits);

    // Build unified chronological movements
    interface UnifiedMovement {
      id: string;
      date: string;
      type: "ADDED" | "SOLD" | "ADJUSTMENT" | "INITIAL" | "PICKUP";
      typeLabel: string;
      reference: string;
      referenceId?: string;
      partyName: string; // Customer name or Vendor/Warehouse
      partyContact?: string | null;
      handledBy?: string | null; // Sales Rep / Pickup person / Staff
      sideMark?: string | null; // Side mark notes / warehouse tags
      shipTo?: string | null; // Delivery / pickup location
      quantityChange: number; // + for added, - for sold
      unitPrice: number;
      totalAmount: number;
      notes?: string | null;
      status?: string;
    }

    const movements: UnifiedMovement[] = [];

    // Add inventory logs
    inventoryLogs.forEach((log) => {
      const isAddition = log.quantity > 0;
      movements.push({
        id: `log-${log.id}`,
        date: log.createdAt.toISOString(),
        type: (log.type as any) || (isAddition ? "ADDED" : "ADJUSTMENT"),
        typeLabel:
          log.type === "INITIAL"
            ? "Initial Stock"
            : log.type === "RESTOCK"
            ? "Restock Received"
            : isAddition
            ? "Inventory Added"
            : "Stock Reduction",
        reference: log.reference || "Stock Adjustment",
        partyName: log.performedBy || "Warehouse / Admin",
        handledBy: log.performedBy || null,
        sideMark: log.notes || null,
        quantityChange: log.quantity,
        unitPrice: Number(log.unitCost ?? product.cost ?? 0),
        totalAmount: Math.abs(log.quantity) * Number(log.unitCost ?? product.cost ?? 0),
        notes: log.notes,
      });
    });

    // If no logs exist yet (legacy product), add initial creation movement
    if (inventoryLogs.length === 0 && product.inventory !== null && product.inventory > 0) {
      movements.push({
        id: `init-${product.id}`,
        date: product.createdAt.toISOString(),
        type: "INITIAL",
        typeLabel: "Initial Stock Recorded",
        reference: "Initial Setup",
        partyName: "System",
        handledBy: "Admin",
        quantityChange: product.inventory,
        unitPrice: Number(product.cost || 0),
        totalAmount: product.inventory * Number(product.cost || 0),
        notes: "Product created with starting inventory",
      });
    }

    // Add invoiced sales & pickups
    invoiceItems.forEach((item) => {
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      const amount = Number(item.amount);

      movements.push({
        id: `inv-item-${item.id}`,
        date: item.invoice.date.toISOString(),
        type: "SOLD",
        typeLabel: "Sold / Invoiced",
        reference: item.invoice.number,
        referenceId: item.invoice.id,
        partyName: item.invoice.customer.name,
        partyContact: item.invoice.customer.phone || item.invoice.customer.email || null,
        handledBy: item.invoice.salesRep || null,
        sideMark: item.invoice.sideMark || null,
        shipTo: item.invoice.shipTo || null,
        quantityChange: -qty,
        unitPrice: rate,
        totalAmount: amount,
        notes: item.description,
        status: item.invoice.status,
      });
    });

    // Sort all movements chronologically descending (newest first)
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate Summary Stats
    const totalUnitsAdded = movements
      .filter((m) => m.quantityChange > 0)
      .reduce((sum, m) => sum + m.quantityChange, 0);

    const totalUnitsSold = invoiceItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    const totalRevenue = invoiceItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    const summary = {
      currentStock: product.inventory ?? 0,
      unit: product.unit || "pcs",
      totalUnitsAdded,
      totalUnitsSold,
      totalRevenue,
      totalMovementsCount: movements.length,
      customerCount: topCustomers.length,
      unitPrice: Number(product.price),
      unitCost: Number(product.cost),
      estimatedInventoryValue: (product.inventory ?? 0) * Number(product.cost || 0),
    };

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        type: product.type,
        category: product.category,
        location: product.location,
        description: product.description,
        unit: product.unit || "pcs",
        price: Number(product.price),
        cost: Number(product.cost),
        inventory: product.inventory,
        createdAt: product.createdAt.toISOString(),
      },
      organization: product.organization,
      summary,
      topCustomers,
      movements,
    });
  } catch (error) {
    console.error("Error generating product inventory report:", error);
    return NextResponse.json(
      { error: "Failed to generate product report" },
      { status: 500 }
    );
  }
}
