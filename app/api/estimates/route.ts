import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { EstimateStatus } from "@prisma/client";

const estimateItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  rate: z.number().min(0),
  amount: z.number().min(0),
  tax: z.number().min(0).optional(),
});

const estimateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string(),
  expiryDate: z.string().optional(),
  status: z.nativeEnum(EstimateStatus),
  items: z.array(estimateItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0).optional(),
  total: z.number().min(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

// GET - List estimates
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = estimateSchema.parse(body);

    // Generate estimate number
    const lastEstimate = await prisma.estimate.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    let estimateNumber = "EST-001";
    if (lastEstimate) {
      const lastNumber = parseInt(lastEstimate.number.split("-")[1] || "0");
      estimateNumber = `EST-${String(lastNumber + 1).padStart(3, "0")}`;
    }

    // Create estimate with items
    const estimate = await prisma.estimate.create({
      data: {
        organizationId: user.organizationId,
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
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating estimate:", error);
    return NextResponse.json(
      { error: "Failed to create estimate" },
      { status: 500 }
    );
  }
}



