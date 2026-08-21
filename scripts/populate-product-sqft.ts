import { prisma } from "../db/prisma";
import { extractSqftPerBox } from "../lib/flooring-calculator";

async function populateSqft() {
  console.log("Parsing Sqft/Bx and Bx/Plt for existing products...");
  const products = await prisma.product.findMany({
    select: { id: true, description: true }
  });

  const updates = products
    .map(p => {
      const sqft = extractSqftPerBox(p.description);
      let plt: number | null = null;
      if (p.description) {
        const m = p.description.match(/Bx\/Plt:\s*(\d+)/i);
        if (m) plt = parseInt(m[1], 10);
      }
      return { id: p.id, sqft, plt };
    })
    .filter(u => u.sqft !== null || u.plt !== null);

  console.log(`Found ${updates.length} products to update`);

  // Execute in batches of 15
  for (let i = 0; i < updates.length; i += 15) {
    const batch = updates.slice(i, i + 15);
    await Promise.all(
      batch.map(u =>
        prisma.product.update({
          where: { id: u.id },
          data: {
            sqftPerBox: u.sqft || undefined,
            boxesPerPallet: u.plt || undefined,
          }
        })
      )
    );
  }

  console.log(`Successfully updated ${updates.length} products with Sqft/Bx!`);
}

populateSqft()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
