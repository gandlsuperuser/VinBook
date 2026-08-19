import { PrismaClient, AccountType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a default organization
  const organization = await prisma.organization.upsert({
    where: { slug: "default-org" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default-org",
    },
  });

  console.log("✅ Created organization:", organization.name);

  // Create default chart of accounts
  const accounts = [
    // Assets
    { code: "1000", name: "Cash", type: AccountType.ASSET, parentId: null },
    { code: "1100", name: "Accounts Receivable", type: AccountType.ASSET, parentId: null },
    { code: "1200", name: "Inventory", type: AccountType.ASSET, parentId: null },
    { code: "1300", name: "Prepaid Expenses", type: AccountType.ASSET, parentId: null },
    { code: "1400", name: "Property, Plant & Equipment", type: AccountType.ASSET, parentId: null },
    
    // Liabilities
    { code: "2000", name: "Accounts Payable", type: AccountType.LIABILITY, parentId: null },
    { code: "2100", name: "Accrued Expenses", type: AccountType.LIABILITY, parentId: null },
    { code: "2200", name: "Short-term Debt", type: AccountType.LIABILITY, parentId: null },
    { code: "2300", name: "Long-term Debt", type: AccountType.LIABILITY, parentId: null },
    
    // Equity
    { code: "3000", name: "Owner's Equity", type: AccountType.EQUITY, parentId: null },
    { code: "3100", name: "Retained Earnings", type: AccountType.EQUITY, parentId: null },
    
    // Revenue
    { code: "4000", name: "Sales Revenue", type: AccountType.REVENUE, parentId: null },
    { code: "4100", name: "Service Revenue", type: AccountType.REVENUE, parentId: null },
    { code: "4200", name: "Other Income", type: AccountType.REVENUE, parentId: null },
    
    // Expenses
    { code: "5000", name: "Cost of Goods Sold", type: AccountType.EXPENSE, parentId: null },
    { code: "6000", name: "Operating Expenses", type: AccountType.EXPENSE, parentId: null },
    { code: "6100", name: "Salaries & Wages", type: AccountType.EXPENSE, parentId: null },
    { code: "6200", name: "Rent", type: AccountType.EXPENSE, parentId: null },
    { code: "6300", name: "Utilities", type: AccountType.EXPENSE, parentId: null },
    { code: "6400", name: "Marketing & Advertising", type: AccountType.EXPENSE, parentId: null },
    { code: "6500", name: "Office Supplies", type: AccountType.EXPENSE, parentId: null },
    { code: "6600", name: "Professional Services", type: AccountType.EXPENSE, parentId: null },
    { code: "6700", name: "Depreciation", type: AccountType.EXPENSE, parentId: null },
    { code: "6800", name: "Interest Expense", type: AccountType.EXPENSE, parentId: null },
    { code: "6900", name: "Other Expenses", type: AccountType.EXPENSE, parentId: null },
  ];

  for (const account of accounts) {
    await prisma.ledgerAccount.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: account.code,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: account.parentId,
        isSystem: true,
        isActive: true,
      },
    });
  }

  console.log(`✅ Created ${accounts.length} chart of accounts`);

  // Create default settings
  await prisma.settings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      taxSettings: {
        defaultTaxRate: 0,
        taxInclusive: false,
      },
      invoiceSettings: {
        prefix: "INV",
        numberFormat: "00000",
        defaultTerms: "Net 30",
      },
      currency: "USD",
      timezone: "UTC",
      fiscalYearStart: "01-01",
    },
  });

  console.log("✅ Created default settings");

  // Create admin user (you'll need to set a password hash)
  // Note: In production, use bcrypt to hash passwords
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@fastkeep.com" },
    update: {},
    create: {
      email: "admin@fastkeep.com",
      name: "Admin User",
      role: UserRole.ADMIN,
      organizationId: organization.id,
      // Password should be hashed using bcrypt in production
      // For now, this is a placeholder - you'll need to hash it properly
      password: "CHANGE_THIS_PASSWORD", // TODO: Hash this password
    },
  });

  console.log("✅ Created admin user:", adminUser.email);
  console.log("⚠️  WARNING: Change the admin password before production use!");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



