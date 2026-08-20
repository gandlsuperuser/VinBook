import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";

const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string(),
  dueDate: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  total: z.coerce.number().min(0),
  poNumber: z.string().optional(),
  sideMark: z.string().optional(),
  salesRep: z.string().optional(),
  shipTo: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

// GET - List invoices
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.error("No user found in invoice GET request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      console.error("User has no organizationId:", user);
      return NextResponse.json({ error: "User organization not found" }, { status: 400 });
    }

    console.log("Fetching invoices for organizationId:", user.organizationId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as InvoiceStatus | null;
    const customerId = searchParams.get("customerId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: user.organizationId,
    };

    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" as const } },
        { poNumber: { contains: search, mode: "insensitive" as const } },
        { sideMark: { contains: search, mode: "insensitive" as const } },
        { salesRep: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.date.lte = new Date(endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`);
      }
    }

    const [invoices, totalCount, aggregateData, overdueData] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
          payments: true,
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where,
        _sum: {
          total: true,
        },
      }),
      prisma.invoice.aggregate({
        where: {
          ...where,
          status: { not: InvoiceStatus.PAID },
          dueDate: { lt: new Date() },
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    console.log(`Found ${totalCount} invoices for organizationId: ${user.organizationId}, returning ${invoices.length} on page ${page}`);

    return NextResponse.json({
      invoices,
      summary: {
        totalCount,
        totalAmount: Number(aggregateData._sum.total || 0),
        overdueCount: overdueData._count.id || 0,
        overdueAmount: Number(overdueData._sum.total || 0),
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Create invoice
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.error("No user found in invoice POST request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      console.error("User has no organizationId:", user);
      return NextResponse.json({ error: "User organization not found" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = invoiceSchema.parse(body);

    // Generate invoice number (starts at 99-1001, then 99-1002...)
    const existingInvoices = await prisma.invoice.findMany({
      where: { organizationId: user.organizationId },
      select: { number: true },
    });

    let nextNumber = 1001;
    for (const inv of existingInvoices) {
      const match = inv.number.match(/^99-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= nextNumber) {
          nextNumber = num + 1;
        }
      }
    }
    const invoiceNumber = `99-${nextNumber}`;

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: user.organizationId,
        number: invoiceNumber,
        customerId: validatedData.customerId,
        date: new Date(validatedData.date),
        dueDate: new Date(validatedData.dueDate),
        status: validatedData.status,
        subtotal: validatedData.subtotal,
        tax: validatedData.tax,
        discount: validatedData.discount || 0,
        total: validatedData.total,
        poNumber: validatedData.poNumber || null,
        sideMark: validatedData.sideMark || null,
        salesRep: validatedData.salesRep || null,
        shipTo: validatedData.shipTo || null,
        notes: validatedData.notes || null,
        terms: validatedData.terms || null,
        items: {
          create: validatedData.items.map((item, index) => ({
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            tax: item.tax || 0,
            order: index,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error creating invoice:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating invoice:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json(
      { 
        error: "Failed to create invoice",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}



