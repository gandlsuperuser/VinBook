import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { ProductType } from "@prisma/client";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  type: z.nativeEnum(ProductType),
  price: z.number().min(0, "Price must be positive"),
  cost: z.number().min(0, "Cost must be positive").optional(),
  category: z.string().optional(),
  inventory: z.number().int().optional(),
  unit: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - Get single product
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
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        invoiceItems: {
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                date: true,
                customer: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            invoice: {
              date: "desc",
            },
          },
          take: 10,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT - Update product
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
    const validatedData = productSchema.parse(body);

    // Check if product exists and belongs to organization
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const product = await prisma.product.update({
      where: { id: id },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        sku: validatedData.sku || null,
        type: validatedData.type,
        price: validatedData.price,
        cost: validatedData.cost || 0,
        category: validatedData.category || null,
        inventory: validatedData.inventory || null,
        unit: validatedData.unit || "pcs",
        location: validatedData.location || null,
        isActive: validatedData.isActive ?? true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
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
    // Check if product exists and belongs to organization
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        invoiceItems: true,
        estimateItems: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product is used in invoices or estimates
    if (product.invoiceItems.length > 0 || product.estimateItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete product that is used in invoices or estimates. Please deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}


