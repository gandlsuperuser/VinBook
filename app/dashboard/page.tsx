import { requireAuth } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { format, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, addDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ExpensesPieChart } from "@/components/dashboard/expenses-pie-chart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  description: string;
}

function MetricCard({ title, value, change, changeType, icon, description }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden transition-transform duration-150 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {change && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
                changeType === "negative" && "text-rose-600 dark:text-rose-400",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {changeType === "positive" && <ArrowUpRight className="h-3 w-3" />}
              {changeType === "negative" && <ArrowDownRight className="h-3 w-3" />}
              {change}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireAuth();

  if (!user.organizationId) {
    redirect("/login");
  }

  const orgId = user.organizationId;
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);

  // --- Revenue & Invoice Metrics ---
  let paidInvoices: any[] = [];
  let sentInvoices: any[] = [];
  let overdueInvoices: any[] = [];
  let recentPayments: any[] = [];
  let expenses: any[] = [];
  let bankAccounts: any[] = [];

  try {
    const results = await Promise.all([
      // All paid invoices total
      prisma.invoice.findMany({
        where: { organizationId: orgId, status: "PAID" },
        select: { total: true, date: true },
      }),
      // Sent/partially paid invoices for upcoming
      prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["SENT", "PARTIAL"] },
          dueDate: { lte: thirtyDaysFromNow },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      // Overdue invoices for alerts
      prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
          dueDate: { lt: now },
        },
        include: { customer: { select: { name: true } } },
      }),
      // Recent 5 payments
      prisma.payment.findMany({
        where: { invoice: { organizationId: orgId }, status: "COMPLETED" },
        include: { invoice: { select: { number: true, customer: { select: { name: true } } } } },
        orderBy: { date: "desc" },
        take: 5,
      }),
      // All expenses
      prisma.expense.findMany({
        where: { organizationId: orgId, status: { in: ["PAID", "APPROVED", "REIMBURSED"] } },
        select: { amount: true, category: true, date: true, description: true },
      }),
      // Bank accounts for cash flow
      prisma.bankAccount.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { balance: true },
      }),
    ]);

    [paidInvoices, sentInvoices, overdueInvoices, recentPayments, expenses, bankAccounts] = results;
  } catch (dbErr) {
    console.error("Error fetching dashboard metrics:", dbErr);
  }

  // Calculate totals
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Cash flow from bank accounts
  const cashFlow = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  // Monthly revenue for last 6 months
  const monthlyRevenue: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthKey = format(monthDate, "MMM");
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const monthTotal = paidInvoices
      .filter((inv) => {
        const d = new Date(inv.date);
        return isAfter(d, monthStart) && isBefore(d, monthEnd) || format(d, "yyyy-MM") === format(monthDate, "yyyy-MM");
      })
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    monthlyRevenue[monthKey] = monthTotal;
  }

  const revenueChartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    const cat = exp.category || "Uncategorized";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(exp.amount);
  }

  const expensesPieData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    amount,
  }));

  // Overdue amount for alerts
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || user.email}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="from paid invoices"
          changeType="positive"
          icon={<DollarSign className="h-4 w-4" />}
          description="All time"
        />

        <MetricCard
          title="Total Expenses"
          value={`$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="this period"
          changeType="negative"
          icon={<TrendingDown className="h-4 w-4" />}
          description="All time"
        />

        <MetricCard
          title="Net Profit"
          value={`$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={netProfit >= 0 ? "in the green" : "in the red"}
          changeType={netProfit >= 0 ? "positive" : "negative"}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Revenue minus expenses"
        />

        <MetricCard
          title="Cash Flow"
          value={`$${cashFlow.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="bank balances"
          changeType="neutral"
          icon={<Receipt className="h-4 w-4" />}
          description="Available balance"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Monthly revenue from paid invoices — last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <RevenueChart data={revenueChartData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                No revenue data yet. Create and pay your first invoice!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses Breakdown</CardTitle>
            <CardDescription>Expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesPieData.length > 0 ? (
              <ExpensesPieChart data={expensesPieData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                No expense data yet. Start tracking your expenses!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest incoming payments</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {payment.invoice.customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.invoice.number} · {format(new Date(payment.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      +${Number(payment.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Invoices
            </CardTitle>
            <CardDescription>Invoices due in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {sentInvoices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No upcoming invoices due
              </div>
            ) : (
              <div className="space-y-3">
                {sentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.customer.name} · Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      ${Number(invoice.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueInvoices.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-2 w-2 rounded-full bg-emerald-500" />
              No alerts — everything looks good!
            </div>
          ) : (
            <div className="space-y-2">
              {overdueInvoices.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
                      {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    ${overdueTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
