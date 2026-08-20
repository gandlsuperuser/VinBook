"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface ProfitLossData {
  reportType: string;
  organization: { name: string };
  period: { startDate: string; endDate: string };
  currency: string;
  data: {
    revenue: {
      categories: Array<{ category: string; amount: number }>;
      totalRevenue: number;
      discounts: number;
      taxCollected: number;
    };
    cogs: {
      amount: number;
      categories: Array<{ category: string; amount: number }>;
    };
    grossProfit: number;
    grossMarginPct: number;
    expenses: {
      categories: Array<{ category: string; amount: number }>;
      totalOperatingExpenses: number;
    };
    netIncome: number;
    netProfitMarginPct: number;
  };
}

export function ProfitLossView({ report }: { report: ProfitLossData }) {
  const { data, organization, period } = report;
  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatMoney(data.revenue.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoiced & operating sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatMoney(data.grossProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">{data.grossMarginPct.toFixed(1)}% gross margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatMoney(data.expenses.totalOperatingExpenses + data.cogs.amount)}</div>
            <p className="text-xs text-muted-foreground mt-1">COGS + operating overhead</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
            <TrendingUp className={`h-4 w-4 ${data.netIncome >= 0 ? "text-emerald-600" : "text-rose-600"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.netIncome >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatMoney(data.netIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{data.netProfitMarginPct.toFixed(1)}% net margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Printable / Report Printable Card */}
      <Card id="report-print-container" className="bg-card shadow-sm border">
        <CardHeader className="border-b bg-muted/20 pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">VinBook Financial Report</div>
          <CardTitle className="text-2xl font-bold tracking-tight">{organization.name}</CardTitle>
          <div className="text-lg font-semibold text-foreground">Income Statement (Profit & Loss)</div>
          <CardDescription>
            For the period {period.startDate} to {period.endDate}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Revenue Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Operating Revenue</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.revenue.categories.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground italic pl-4">No revenue recorded in this period</TableCell>
                    <TableCell className="text-right font-mono">$0.00</TableCell>
                  </TableRow>
                ) : (
                  data.revenue.categories.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-4 font-medium">{item.category}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
                {data.revenue.discounts > 0 && (
                  <TableRow>
                    <TableCell className="pl-4 text-muted-foreground">Less: Sales Discounts</TableCell>
                    <TableCell className="text-right font-mono text-rose-600">-{formatMoney(data.revenue.discounts)}</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell>Total Operating Revenue</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{formatMoney(data.revenue.totalRevenue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Cost of Goods Sold */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cost of Goods Sold (COGS)</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.cogs.categories.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground italic pl-4">Direct materials & inventory costs</TableCell>
                    <TableCell className="text-right font-mono">$0.00</TableCell>
                  </TableRow>
                ) : (
                  data.cogs.categories.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-4 font-medium">{item.category}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell>Total Cost of Goods Sold</TableCell>
                  <TableCell className="text-right font-mono text-rose-600">{formatMoney(data.cogs.amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Gross Profit Summary Banner */}
          <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/40 p-4 border border-blue-200 dark:border-blue-800">
            <div>
              <div className="font-bold text-blue-900 dark:text-blue-200">GROSS PROFIT</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Revenue minus Cost of Goods Sold</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono text-blue-900 dark:text-blue-200">{formatMoney(data.grossProfit)}</div>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300">{data.grossMarginPct.toFixed(1)}% Margin</div>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Operating Expenses</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.expenses.categories.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground italic pl-4">No operating expenses recorded</TableCell>
                    <TableCell className="text-right font-mono">$0.00</TableCell>
                  </TableRow>
                ) : (
                  data.expenses.categories.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-4 font-medium">{item.category}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell>Total Operating Expenses</TableCell>
                  <TableCell className="text-right font-mono text-rose-600">{formatMoney(data.expenses.totalOperatingExpenses)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Net Income Summary Banner */}
          <div className={`flex items-center justify-between rounded-lg p-5 border ${
            data.netIncome >= 0
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
          }`}>
            <div>
              <div className={`text-lg font-extrabold ${data.netIncome >= 0 ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200"}`}>
                NET OPERATING INCOME / (LOSS)
              </div>
              <div className={`text-xs ${data.netIncome >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                Gross Profit minus Total Operating Expenses
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-extrabold font-mono ${data.netIncome >= 0 ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200"}`}>
                {formatMoney(data.netIncome)}
              </div>
              <div className={`text-xs font-medium ${data.netIncome >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {data.netProfitMarginPct.toFixed(1)}% Net Margin
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
