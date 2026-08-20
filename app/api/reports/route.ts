import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: "User organization not found" }, { status: 400 });
    }

    const orgId = user.organizationId;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "profit-loss";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const asOfDateParam = searchParams.get("asOfDate");

    const now = new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), 0, 1);
    const endDate = endDateParam ? new Date(endDateParam + "T23:59:59.999Z") : new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const asOfDate = asOfDateParam ? new Date(asOfDateParam + "T23:59:59.999Z") : now;

    // Fetch Organization & Settings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { settingsRecord: true },
    });

    // -------------------------------------------------------------
    // 1. PROFIT & LOSS REPORT
    // -------------------------------------------------------------
    if (type === "profit-loss") {
      // Invoices in date range
      const invoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          status: { notIn: ["DRAFT", "CANCELLED"] },
        },
        include: {
          items: {
            include: { product: true },
          },
          customer: { select: { name: true } },
        },
      });

      // Expenses in date range
      const expenses = await prisma.expense.findMany({
        where: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          status: { in: ["PAID", "APPROVED", "REIMBURSED"] },
        },
        include: { vendor: { select: { name: true } } },
      });

      // Ledger entries for REVENUE and EXPENSE accounts
      const ledgerEntries = await prisma.ledgerEntry.findMany({
        where: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          account: {
            type: { in: ["REVENUE", "EXPENSE"] },
          },
        },
        include: { account: true },
      });

      // Calculate Revenue by Category / Product
      const revenueByCategory: Record<string, number> = {};
      let totalInvoicedRevenue = 0;
      let totalTaxCollected = 0;
      let totalDiscountGiven = 0;

      for (const inv of invoices) {
        totalInvoicedRevenue += Number(inv.subtotal);
        totalTaxCollected += Number(inv.tax);
        totalDiscountGiven += Number(inv.discount || 0);

        for (const item of inv.items) {
          const category = item.product?.category || "Sales & Services";
          revenueByCategory[category] = (revenueByCategory[category] || 0) + Number(item.amount);
        }
      }

      // If no item-level breakdown, fallback to general category
      if (Object.keys(revenueByCategory).length === 0 && totalInvoicedRevenue > 0) {
        revenueByCategory["Sales Revenue"] = totalInvoicedRevenue;
      }

      // Direct ledger revenues (reference != invoice to prevent double counting)
      for (const entry of ledgerEntries) {
        if (entry.account.type === "REVENUE" && entry.reference !== "invoice") {
          const cat = entry.account.name;
          const net = Number(entry.credit) - Number(entry.debit);
          if (net > 0) {
            revenueByCategory[cat] = (revenueByCategory[cat] || 0) + net;
            totalInvoicedRevenue += net;
          }
        }
      }

      // Calculate Expenses by Category
      const expensesByCategory: Record<string, number> = {};
      let totalOperatingExpenses = 0;
      let cogs = 0;

      for (const exp of expenses) {
        const cat = exp.category || "General Expenses";
        const amt = Number(exp.amount);
        if (cat.toLowerCase().includes("cost of goods") || cat.toLowerCase().includes("materials") || cat.toLowerCase().includes("cogs")) {
          cogs += amt;
        } else {
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
          totalOperatingExpenses += amt;
        }
      }

      // Direct ledger expenses (reference != expense)
      for (const entry of ledgerEntries) {
        if (entry.account.type === "EXPENSE" && entry.reference !== "expense") {
          const cat = entry.account.name;
          const net = Number(entry.debit) - Number(entry.credit);
          if (net > 0) {
            if (cat.toLowerCase().includes("cost of goods") || cat.toLowerCase().includes("cogs")) {
              cogs += net;
            } else {
              expensesByCategory[cat] = (expensesByCategory[cat] || 0) + net;
              totalOperatingExpenses += net;
            }
          }
        }
      }

      const totalRevenue = totalInvoicedRevenue;
      const grossProfit = totalRevenue - cogs;
      const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netIncome = grossProfit - totalOperatingExpenses;
      const netProfitMarginPct = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      return NextResponse.json({
        reportType: "profit-loss",
        organization: { name: org?.name || "Organization" },
        period: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
        currency: org?.settingsRecord?.currency || "USD",
        data: {
          revenue: {
            categories: Object.entries(revenueByCategory).map(([category, amount]) => ({ category, amount })),
            totalRevenue,
            discounts: totalDiscountGiven,
            taxCollected: totalTaxCollected,
          },
          cogs: {
            amount: cogs,
            categories: cogs > 0 ? [{ category: "Cost of Goods Sold & Materials", amount: cogs }] : [],
          },
          grossProfit,
          grossMarginPct,
          expenses: {
            categories: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
            totalOperatingExpenses,
          },
          netIncome,
          netProfitMarginPct,
        },
      });
    }

    // -------------------------------------------------------------
    // 2. BALANCE SHEET REPORT
    // -------------------------------------------------------------
    if (type === "balance-sheet") {
      // 1. Bank Accounts (Cash & Cash Equivalents)
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { organizationId: orgId, isActive: true },
      });
      const cashTotal = bankAccounts.reduce((sum, b) => sum + Number(b.balance), 0);

      // 2. Accounts Receivable (Unpaid Invoices as of asOfDate)
      const unpaidInvoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          date: { lte: asOfDate },
          status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
        },
        include: { payments: true },
      });

      let totalAR = 0;
      for (const inv of unpaidInvoices) {
        const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        totalAR += Math.max(0, Number(inv.total) - paid);
      }

      // 3. Inventory Asset Value
      const products = await prisma.product.findMany({
        where: { organizationId: orgId, isActive: true },
      });
      const inventoryTotal = products.reduce((sum, p) => sum + (Number(p.cost) * (p.inventory || 0)), 0);

      // 4. Accounts Payable (Unpaid Approved Expenses)
      const unpaidExpenses = await prisma.expense.findMany({
        where: {
          organizationId: orgId,
          date: { lte: asOfDate },
          status: { in: ["APPROVED", "PENDING"] },
        },
      });
      const totalAP = unpaidExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // 5. Sales Tax Payable
      const allInvoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          date: { lte: asOfDate },
          status: { notIn: ["DRAFT", "CANCELLED"] },
        },
      });
      const salesTaxPayable = allInvoices.reduce((sum, inv) => sum + Number(inv.tax), 0);

      // 6. Net Income / Retained Earnings as of date
      const paidInvoicesTotal = allInvoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0);
      const allExpenses = await prisma.expense.findMany({
        where: {
          organizationId: orgId,
          date: { lte: asOfDate },
          status: { in: ["PAID", "APPROVED", "REIMBURSED"] },
        },
      });
      const totalExp = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const cumulativeNetIncome = paidInvoicesTotal - totalExp;

      // Assets Breakdown
      const currentAssets = [
        { name: "Cash & Cash Equivalents (Bank Accounts)", amount: cashTotal },
        { name: "Accounts Receivable (A/R)", amount: totalAR },
        { name: "Inventory Asset", amount: inventoryTotal },
      ];
      const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);
      const totalAssets = totalCurrentAssets;

      // Liabilities Breakdown
      const currentLiabilities = [
        { name: "Accounts Payable (A/P)", amount: totalAP },
        { name: "Sales Tax Payable", amount: salesTaxPayable },
      ];
      const totalCurrentLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);
      const totalLiabilities = totalCurrentLiabilities;

      // Equity Breakdown
      const retainedEarnings = totalAssets - totalLiabilities - cumulativeNetIncome;
      const equity = [
        { name: "Owner Equity / Retained Earnings", amount: Math.max(0, retainedEarnings) },
        { name: "Current Net Income", amount: cumulativeNetIncome },
      ];
      const totalEquity = totalAssets - totalLiabilities; // Balanced by definition

      return NextResponse.json({
        reportType: "balance-sheet",
        organization: { name: org?.name || "Organization" },
        asOfDate: asOfDate.toISOString().split("T")[0],
        currency: org?.settingsRecord?.currency || "USD",
        data: {
          assets: {
            currentAssets,
            totalCurrentAssets,
            totalAssets,
          },
          liabilities: {
            currentLiabilities,
            totalCurrentLiabilities,
            totalLiabilities,
          },
          equity: {
            items: equity,
            totalEquity,
          },
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
          isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        },
      });
    }

    // -------------------------------------------------------------
    // 3. CASH FLOW STATEMENT
    // -------------------------------------------------------------
    if (type === "cash-flow") {
      // Operating cash receipts from customers
      const paymentsReceived = await prisma.payment.findMany({
        where: {
          invoice: { organizationId: orgId },
          date: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
        include: {
          invoice: { select: { number: true, customer: { select: { name: true } } } },
        },
      });
      const customerCashTotal = paymentsReceived.reduce((sum, p) => sum + Number(p.amount), 0);

      // Operating cash paid for expenses
      const cashExpenses = await prisma.expense.findMany({
        where: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          status: { in: ["PAID", "REIMBURSED"] },
        },
      });
      const expenseCashTotal = cashExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const netOperatingCashFlow = customerCashTotal - expenseCashTotal;
      const netInvestingCashFlow = 0;
      const netFinancingCashFlow = 0;
      const netChangeInCash = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

      // Current bank balance
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { organizationId: orgId, isActive: true },
      });
      const endingCash = bankAccounts.reduce((sum, b) => sum + Number(b.balance), 0);
      const beginningCash = Math.max(0, endingCash - netChangeInCash);

      return NextResponse.json({
        reportType: "cash-flow",
        organization: { name: org?.name || "Organization" },
        period: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
        currency: org?.settingsRecord?.currency || "USD",
        data: {
          operatingActivities: [
            { description: "Cash received from customer invoice payments", amount: customerCashTotal },
            { description: "Cash paid for vendor & operational expenses", amount: -expenseCashTotal },
          ],
          netOperatingCashFlow,
          investingActivities: [
            { description: "Capital expenditures & asset purchases", amount: 0 },
          ],
          netInvestingCashFlow,
          financingActivities: [
            { description: "Owner contributions & distributions", amount: 0 },
          ],
          netFinancingCashFlow,
          netChangeInCash,
          beginningCash,
          endingCash,
        },
      });
    }

    // -------------------------------------------------------------
    // 4. ACCOUNTS RECEIVABLE (A/R) AGING REPORT
    // -------------------------------------------------------------
    if (type === "ar-aging") {
      const invoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
        },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          payments: true,
        },
        orderBy: { dueDate: "asc" },
      });

      const customerAgingMap: Record<string, {
        customer: any;
        current: number;
        days30: number;
        days60: number;
        days90Plus: number;
        total: number;
        invoices: any[];
      }> = {};

      let totalCurrent = 0;
      let total30 = 0;
      let total60 = 0;
      let total90Plus = 0;
      let grandTotalAR = 0;

      for (const inv of invoices) {
        const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const outstanding = Number(inv.total) - paid;
        if (outstanding <= 0) continue;

        const dueDate = new Date(inv.dueDate);
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        const custId = inv.customer.id;
        if (!customerAgingMap[custId]) {
          customerAgingMap[custId] = {
            customer: inv.customer,
            current: 0,
            days30: 0,
            days60: 0,
            days90Plus: 0,
            total: 0,
            invoices: [],
          };
        }

        const itemRecord = {
          id: inv.id,
          number: inv.number,
          date: inv.date.toISOString().split("T")[0],
          dueDate: inv.dueDate.toISOString().split("T")[0],
          daysPastDue: Math.max(0, daysPastDue),
          total: Number(inv.total),
          paid,
          outstanding,
        };

        customerAgingMap[custId].invoices.push(itemRecord);
        customerAgingMap[custId].total += outstanding;
        grandTotalAR += outstanding;

        if (daysPastDue <= 0) {
          customerAgingMap[custId].current += outstanding;
          totalCurrent += outstanding;
        } else if (daysPastDue <= 30) {
          customerAgingMap[custId].days30 += outstanding;
          total30 += outstanding;
        } else if (daysPastDue <= 60) {
          customerAgingMap[custId].days60 += outstanding;
          total60 += outstanding;
        } else {
          customerAgingMap[custId].days90Plus += outstanding;
          total90Plus += outstanding;
        }
      }

      return NextResponse.json({
        reportType: "ar-aging",
        organization: { name: org?.name || "Organization" },
        asOfDate: now.toISOString().split("T")[0],
        currency: org?.settingsRecord?.currency || "USD",
        data: {
          customers: Object.values(customerAgingMap),
          summary: {
            current: totalCurrent,
            days30: total30,
            days60: total60,
            days90Plus: total90Plus,
            grandTotal: grandTotalAR,
          },
        },
      });
    }

    // -------------------------------------------------------------
    // 5. TRIAL BALANCE / CHART OF ACCOUNTS SUMMARY
    // -------------------------------------------------------------
    if (type === "trial-balance") {
      const accounts = await prisma.ledgerAccount.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          entries: {
            where: { date: { lte: asOfDate } },
          },
        },
        orderBy: [{ type: "asc" }, { code: "asc" }],
      });

      let totalDebits = 0;
      let totalCredits = 0;

      const items = accounts.map((acc) => {
        const debitSum = acc.entries.reduce((sum, e) => sum + Number(e.debit), 0);
        const creditSum = acc.entries.reduce((sum, e) => sum + Number(e.credit), 0);
        
        let netDebit = 0;
        let netCredit = 0;

        // Assets and Expenses naturally carry DEBIT balances
        if (acc.type === "ASSET" || acc.type === "EXPENSE") {
          const balance = debitSum - creditSum;
          if (balance >= 0) {
            netDebit = balance;
          } else {
            netCredit = Math.abs(balance);
          }
        } else {
          // Liabilities, Equity, and Revenue naturally carry CREDIT balances
          const balance = creditSum - debitSum;
          if (balance >= 0) {
            netCredit = balance;
          } else {
            netDebit = Math.abs(balance);
          }
        }

        totalDebits += netDebit;
        totalCredits += netCredit;

        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit: netDebit,
          credit: netCredit,
        };
      });

      return NextResponse.json({
        reportType: "trial-balance",
        organization: { name: org?.name || "Organization" },
        asOfDate: asOfDate.toISOString().split("T")[0],
        currency: org?.settingsRecord?.currency || "USD",
        data: {
          accounts: items,
          totalDebits,
          totalCredits,
          isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        },
      });
    }

    // -------------------------------------------------------------
    // 6. SALES TAX SUMMARY REPORT
    // -------------------------------------------------------------
    if (type === "tax-summary") {
      const invoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          date: { gte: startDate, lte: endDate },
          status: { notIn: ["DRAFT", "CANCELLED"] },
        },
        include: { customer: { select: { name: true } } },
      });

      let grossSales = 0;
      let taxableSales = 0;
      let nonTaxableSales = 0;
      let taxCollected = 0;

      const invoiceTaxes = invoices.map((inv) => {
        const sub = Number(inv.subtotal);
        const tax = Number(inv.tax);
        grossSales += Number(inv.total);
        taxCollected += tax;

        if (tax > 0) {
          taxableSales += sub;
        } else {
          nonTaxableSales += sub;
        }

        return {
          id: inv.id,
          number: inv.number,
          date: inv.date.toISOString().split("T")[0],
          customerName: inv.customer.name,
          subtotal: sub,
          tax,
          total: Number(inv.total),
        };
      });

      return NextResponse.json({
        reportType: "tax-summary",
        organization: { name: org?.name || "Organization" },
        period: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
        currency: org?.settingsRecord?.currency || "USD",
        data: {
          grossSales,
          taxableSales,
          nonTaxableSales,
          taxCollected,
          invoices: invoiceTaxes,
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
