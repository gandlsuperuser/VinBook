import { prisma } from "../db/prisma";
import { INVENTORY_CATALOG } from "../lib/inventory-data";

async function main() {
  console.log("🚀 Starting inventory sync with SKU and color names...");

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (organizations.length === 0) {
    console.log("⚠️ No organizations found in the database.");
    return;
  }

  console.log(`📋 Found ${organizations.length} organization(s): ${organizations.map((o) => o.name).join(", ")}`);

  for (const org of organizations) {
    console.log(`\n📦 Processing ${INVENTORY_CATALOG.length} items for organization: "${org.name}" (${org.id})...`);
    
    // Fetch all existing products for this org
    const existingProducts = await prisma.product.findMany({
      where: { organizationId: org.id },
      select: { id: true, sku: true },
    });

    const skuMap = new Map(existingProducts.filter((p) => p.sku).map((p) => [p.sku!, p.id]));

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of INVENTORY_CATALOG) {
      const existingId = skuMap.get(item.sku);

      if (existingId) {
        await prisma.product.update({
          where: { id: existingId },
          data: {
            name: item.name,
            description: item.description,
            category: item.category,
            type: item.type,
            price: item.price,
            cost: item.cost,
            inventory: item.inventory,
            unit: item.unit,
            location: item.location,
            isActive: true,
          },
        });
        updatedCount++;
      } else {
        await prisma.product.create({
          data: {
            organizationId: org.id,
            sku: item.sku,
            name: item.name,
            description: item.description,
            category: item.category,
            type: item.type,
            price: item.price,
            cost: item.cost,
            inventory: item.inventory,
            unit: item.unit,
            location: item.location,
            isActive: true,
          },
        });
        createdCount++;
      }
    }

    console.log(`✅ Organization "${org.name}": Created ${createdCount}, Updated ${updatedCount} products.`);
  }

  const totalProducts = await prisma.product.count();
  console.log(`\n🎉 Inventory sync complete! Total products in database: ${totalProducts}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importing inventory:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
