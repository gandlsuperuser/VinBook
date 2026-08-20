"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface BalanceSheetData {
  reportType: string;
  organization: { name: string };
  asOfDate: string;
  currency: string;
  data: {
    assets: {
      currentAssets: Array<{ name: string; amount: number }>;
      totalCurrentAssets: number;
      totalAssets: number;
    };
    liabilities: {
      currentLiabilities: Array<{ name: string; amount: number }>;
      totalCurrentLiabilities: number;
      totalLiabilities: number;
    };
    equity: {
      items: Array<{ name: string; amount: number }>;
      totalEquity: number;
    };
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  };
}

export function BalanceSheetView({ report }: { report: BalanceSheetData }) {
  const { data, organization, asOfDate } = report;
  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            <Scale className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatMoney(data.assets.totalAssets)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cash, A/R, and Inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatMoney(data.liabilities.totalLiabilities)}</div>
            <p className="text-xs text-muted-foreground mt-1">Accounts payable & taxes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatMoney(data.equity.totalEquity)}</div>
            <p className="text-xs text-muted-foreground mt-1">Retained earnings & Net Income</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Verification Alert */}
      <div className={`flex items-center justify-between rounded-lg p-3 px-4 border ${
        data.isBalanced
          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
      }`}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Accounting Equation: Assets = Liabilities + Equity
          </span>
        </div>
        <div className="text-xs font-mono font-bold">
          {formatMoney(data.assets.totalAssets)} = {formatMoney(data.totalLiabilitiesAndEquity)}
        </div>
      </div>

      {/* Printable Card */}
      <Card id="report-print-container" className="bg-card shadow-sm border">
        <CardHeader className="border-b bg-muted/20 pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">VinBook Financial Report</div>
          <CardTitle className="text-2xl font-bold tracking-tight">{organization.name}</CardTitle>
          <div className="text-lg font-semibold text-foreground">Balance Sheet</div>
          <CardDescription>As of {asOfDate}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Assets Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Assets</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.assets.currentAssets.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-4 font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell className="text-emerald-700 dark:text-emerald-300">TOTAL ASSETS</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-300">
                    {formatMoney(data.assets.totalAssets)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Liabilities Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Liabilities</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.liabilities.currentLiabilities.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-4 font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell className="text-amber-700 dark:text-amber-300">TOTAL LIABILITIES</TableCell>
                  <TableCell className="text-right font-mono text-amber-700 dark:text-amber-300">
                    {formatMoney(data.liabilities.totalLiabilities)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Equity Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Equity</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.equity.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-4 font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell className="text-blue-700 dark:text-blue-300">TOTAL EQUITY</TableCell>
                  <TableCell className="text-right font-mono text-blue-700 dark:text-blue-300">
                    {formatMoney(data.equity.totalEquity)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Liabilities & Equity Grand Total */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-4 border font-bold">
            <div className="text-base tracking-tight">TOTAL LIABILITIES AND EQUITY</div>
            <div className="text-xl font-mono text-primary">{formatMoney(data.totalLiabilitiesAndEquity)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
