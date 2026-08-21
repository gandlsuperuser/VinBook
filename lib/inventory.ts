import { prisma } from "@/db/prisma";

export interface InvoiceItemToDeduct {
  productId?: string | null;
  quantity: number | string | any;
  description?: string;
}

/**
 * Deducts product stock when an invoice is created or converted.
 * Creates an InventoryLog entry for every tracked product item.
 */
export async function deductInventoryForInvoice({
  organizationId,
  invoiceNumber,
  customerName,
  performedBy,
  items,
}: {
  organizationId: string;
  invoiceNumber: string;
  customerName?: string | null;
  performedBy?: string | null;
  items: InvoiceItemToDeduct[];
}) {
  const trackedItems = items.filter((item) => item.productId);

  for (const item of trackedItems) {
    if (!item.productId) continue;

    try {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          organizationId,
        },
      });

      if (!product || product.inventory === null || product.inventory === undefined) {
        continue;
      }

      const qtyToDeduct = Math.max(1, Math.round(Number(item.quantity) || 1));
      const previousStock = product.inventory;
      const newStock = Math.max(0, previousStock - qtyToDeduct);

      // Update product inventory
      await prisma.product.update({
        where: { id: product.id },
        data: { inventory: newStock },
      });

      // Create inventory log
      await prisma.inventoryLog.create({
        data: {
          organizationId,
          productId: product.id,
          type: "SOLD",
          quantity: -qtyToDeduct,
          previousStock,
          newStock,
          unitCost: product.cost,
          reference: `Invoice ${invoiceNumber}`,
          notes: `Sold & dispatched via Invoice ${invoiceNumber}${customerName ? ` to ${customerName}` : ""}`,
          performedBy: performedBy || "System",
        },
      });
    } catch (err) {
      console.error(`Failed to deduct inventory for product ${item.productId}:`, err);
    }
  }
}

/**
 * Restores product inventory when an invoice is deleted or cancelled.
 */
export async function restoreInventoryForInvoice({
  organizationId,
  invoiceNumber,
  customerName,
  performedBy,
  items,
}: {
  organizationId: string;
  invoiceNumber: string;
  customerName?: string | null;
  performedBy?: string | null;
  items: InvoiceItemToDeduct[];
}) {
  const trackedItems = items.filter((item) => item.productId);

  for (const item of trackedItems) {
    if (!item.productId) continue;

    try {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          organizationId,
        },
      });

      if (!product || product.inventory === null || product.inventory === undefined) {
        continue;
      }

      const qtyToRestore = Math.max(1, Math.round(Number(item.quantity) || 1));
      const previousStock = product.inventory;
      const newStock = previousStock + qtyToRestore;

      // Update product inventory
      await prisma.product.update({
        where: { id: product.id },
        data: { inventory: newStock },
      });

      // Create inventory log
      await prisma.inventoryLog.create({
        data: {
          organizationId,
          productId: product.id,
          type: "RETURN",
          quantity: qtyToRestore,
          previousStock,
          newStock,
          unitCost: product.cost,
          reference: `Cancelled Invoice ${invoiceNumber}`,
          notes: `Restored stock from deleted Invoice ${invoiceNumber}${customerName ? ` (${customerName})` : ""}`,
          performedBy: performedBy || "System",
        },
      });
    } catch (err) {
      console.error(`Failed to restore inventory for product ${item.productId}:`, err);
    }
  }
}
