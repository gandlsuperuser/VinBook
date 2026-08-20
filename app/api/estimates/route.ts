import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { EstimateStatus } from "@prisma/client";

const estimateItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).optional(),
});

const estimateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string(),
  expiryDate: z.string().optional(),
  status: z.nativeEnum(EstimateStatus),
  items: z.array(estimateItemSchema).min(1, "At least one item is required"),
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

// GET - List estimates
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as EstimateStatus | null;
    const customerId = searchParams.get("customerId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: user.organizationId,
    };

    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [estimates, total] = await Promise.all([
      prisma.estimate.findMany({
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
        },
      }),
      prisma.estimate.count({ where }),
    ]);

    return NextResponse.json({
      estimates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching estimates:", error);
    return NextResponse.json(
      { error: "Failed to fetch estimates" },
      { status: 500 }
    );
  }
}

// POST - Create estimate
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = estimateSchema.parse(body);

    let organizationId = user.organizationId;
    if (!organizationId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true },
      });
      organizationId = dbUser?.organizationId || "";
    }

    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst();
      organizationId = firstOrg?.id || "";
    }

    // Check customer
    const customer = await prisma.customer.findFirst({
      where: {
        id: validatedData.customerId,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Selected customer was not found. Please select a valid customer from the dropdown." },
        { status: 400 }
      );
    }

    // Generate unique estimate number safely
    const allEstimates = await prisma.estimate.findMany({
      where: { organizationId },
      select: { number: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    let maxNum = 0;
    for (const est of allEstimates) {
      const match = est.number.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const estimateNumber = `EST-${String(maxNum + 1).padStart(3, "0")}`;

    // Create estimate with items
    const estimate = await prisma.estimate.create({
      data: {
        organizationId,
        number: estimateNumber,
        customerId: validatedData.customerId,
        date: new Date(validatedData.date),
        expiryDate: validatedData.expiryDate
          ? new Date(validatedData.expiryDate)
          : null,
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

    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        const field = issue.path.join(" -> ") || "form";
        return `[${field}]: ${issue.message}`;
      });
      return NextResponse.json(
        { error: `Validation Error on ${issues.join(", ")}` },
        { status: 400 }
      );
    }
    console.error("Error creating estimate:", error);
    const msg = (error as any)?.message || "Failed to create estimate";
    return NextResponse.json(
      { error: `Unable to save estimate: ${msg}` },
      { status: 500 }
    );
  }
}



