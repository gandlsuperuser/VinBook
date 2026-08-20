import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";

const inventoryLogSchema = z.object({
  type: z.enum(["ADDED", "RESTOCK", "ADJUSTMENT", "PICKUP"]).default("ADDED"),
  quantity: z.number().int().min(1, "Quantity must be greater than 0"),
  action: z.enum(["ADD", "REMOVE"]).default("ADD"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  performedBy: z.string().optional(),
});

export async function POST(
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
    const validatedData = inventoryLogSchema.parse(body);

    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentInventory = product.inventory ?? 0;
    const isAdding = validatedData.action === "ADD";
    const delta = isAdding ? validatedData.quantity : -validatedData.quantity;
    const newInventory = Math.max(0, currentInventory + delta);

    // Update product inventory & cost if provided
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        inventory: newInventory,
        ...(validatedData.unitCost !== undefined && validatedData.unitCost > 0
          ? { cost: validatedData.unitCost }
          : {}),
      },
    });

    // Create Inventory Log entry
    const log = await prisma.inventoryLog.create({
      data: {
        organizationId: user.organizationId,
        productId: id,
        type: validatedData.type,
        quantity: delta,
        previousStock: currentInventory,
        newStock: newInventory,
        unitCost: validatedData.unitCost ?? product.cost,
        reference: validatedData.reference || (isAdding ? "Stock Received" : "Stock Reduction"),
        notes: validatedData.notes || null,
        performedBy: validatedData.performedBy || user.name || user.email || "Warehouse Staff",
      },
    });

    return NextResponse.json({
      product: updatedProduct,
      log,
      message: `Successfully ${isAdding ? "added" : "reduced"} ${validatedData.quantity} units.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error logging inventory movement:", error);
    return NextResponse.json(
      { error: "Failed to record inventory movement" },
      { status: 500 }
    );
  }
}
