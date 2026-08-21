import { PrismaClient, AccountType } from "@prisma/client";

const prisma = new PrismaClient();

const defaultAccounts = [
  { code: "1000", name: "Cash", type: AccountType.ASSET },
  { code: "1100", name: "Accounts Receivable", type: AccountType.ASSET },
  { code: "1200", name: "Inventory", type: AccountType.ASSET },
  { code: "1300", name: "Prepaid Expenses", type: AccountType.ASSET },
  { code: "1400", name: "Property, Plant & Equipment", type: AccountType.ASSET },
  { code: "2000", name: "Accounts Payable", type: AccountType.LIABILITY },
  { code: "2100", name: "Accrued Expenses", type: AccountType.LIABILITY },
  { code: "2200", name: "Short-term Debt", type: AccountType.LIABILITY },
  { code: "2300", name: "Long-term Debt", type: AccountType.LIABILITY },
  { code: "3000", name: "Owner's Equity", type: AccountType.EQUITY },
  { code: "3100", name: "Retained Earnings", type: AccountType.EQUITY },
  { code: "4000", name: "Sales Revenue", type: AccountType.REVENUE },
  { code: "4100", name: "Service Revenue", type: AccountType.REVENUE },
  { code: "4200", name: "Other Income", type: AccountType.REVENUE },
  { code: "5000", name: "Cost of Goods Sold", type: AccountType.EXPENSE },
  { code: "6000", name: "Operating Expenses", type: AccountType.EXPENSE },
  { code: "6100", name: "Salaries & Wages", type: AccountType.EXPENSE },
  { code: "6200", name: "Rent", type: AccountType.EXPENSE },
  { code: "6300", name: "Utilities", type: AccountType.EXPENSE },
  { code: "6400", name: "Marketing & Advertising", type: AccountType.EXPENSE },
  { code: "6500", name: "Office Supplies", type: AccountType.EXPENSE },
  { code: "6600", name: "Professional Services", type: AccountType.EXPENSE },
  { code: "6700", name: "Depreciation", type: AccountType.EXPENSE },
  { code: "6800", name: "Interest Expense", type: AccountType.EXPENSE },
  { code: "6900", name: "Other Expenses", type: AccountType.EXPENSE },
];

async function main() {
  console.log("🔄 Starting user data isolation separation...");

  // 1. Find vin@123floorings.com
  const vinUser = await prisma.user.findFirst({
    where: { email: { equals: "vin@123floorings.com", mode: "insensitive" } },
    include: { organization: true },
  });

  if (vinUser) {
    console.log(`Found vin@123floorings.com with Org ID: ${vinUser.organizationId} (${vinUser.organization?.name})`);
    if (vinUser.organization?.name === "Default Organization") {
      await prisma.organization.update({
        where: { id: vinUser.organizationId },
        data: { name: "123 Floorings" },
      });
      console.log("Updated vin@123floorings.com organization name to '123 Floorings'");
    }
  } else {
    console.log("⚠️ vin@123floorings.com user not found in database.");
  }

  // 2. Find vincent@123.com
  const vincentUser = await prisma.user.findFirst({
    where: { email: { equals: "vincent@123.com", mode: "insensitive" } },
  });

  if (vincentUser) {
    console.log(`Found vincent@123.com currently tied to Org ID: ${vincentUser.organizationId}`);

    // Create a brand-new, completely separate organization for vincent@123.com
    const newOrgSlug = `vincent-org-${Date.now()}`;
    const newOrg = await prisma.organization.create({
      data: {
        name: "Vincent's Company",
        slug: newOrgSlug,
      },
    });

    console.log(`Created new isolated organization '${newOrg.name}' (ID: ${newOrg.id})`);

    // Create default settings for new organization
    await prisma.settings.create({
      data: {
        organizationId: newOrg.id,
        taxSettings: { defaultTaxRate: 0, taxInclusive: false },
        invoiceSettings: { prefix: "INV", numberFormat: "00000", defaultTerms: "Net 30" },
        currency: "USD",
        timezone: "UTC",
        fiscalYearStart: "01-01",
      },
    });

    // Create standard Chart of Accounts
    await prisma.ledgerAccount.createMany({
      data: defaultAccounts.map((acc) => ({
        organizationId: newOrg.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      })),
      skipDuplicates: true,
    });

    // Update vincent@123.com to point to the new isolated organization
    await prisma.user.update({
      where: { id: vincentUser.id },
      data: {
        organizationId: newOrg.id,
      },
    });

    console.log(`✅ Successfully moved vincent@123.com to new isolated organization: ${newOrg.id}`);
  } else {
    console.log("⚠️ vincent@123.com user not found in database.");
  }

  // 3. Verification of stats
  console.log("\n📊 Verification Summary:");
  const users = await prisma.user.findMany({
    include: {
      organization: {
        include: {
          _count: {
            select: {
              invoices: true,
              customers: true,
              products: true,
              expenses: true,
              estimates: true,
            },
          },
        },
      },
    },
  });

  for (const u of users) {
    console.log(`\nUser: ${u.email} (${u.name})`);
    console.log(`  Organization: ${u.organization?.name} (ID: ${u.organizationId})`);
    console.log(`  - Invoices:  ${u.organization?._count.invoices ?? 0}`);
    console.log(`  - Customers: ${u.organization?._count.customers ?? 0}`);
    console.log(`  - Products:  ${u.organization?._count.products ?? 0}`);
    console.log(`  - Expenses:  ${u.organization?._count.expenses ?? 0}`);
    console.log(`  - Estimates: ${u.organization?._count.estimates ?? 0}`);
  }
}

main()
  .catch((e) => {
    console.error("Error executing separation:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
