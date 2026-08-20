"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface TrialBalanceData {
  reportType: string;
  organization: { name: string };
  asOfDate: string;
  currency: string;
  data: {
    accounts: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      debit: number;
      credit: number;
    }>;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  };
}

export function TrialBalanceView({ report }: { report: TrialBalanceData }) {
  const { data, organization, asOfDate } = report;
  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ASSET":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
      case "LIABILITY":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
      case "EQUITY":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
      case "REVENUE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300";
      case "EXPENSE":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Banner */}
      <div className={`flex items-center justify-between rounded-lg p-4 border ${
        data.isBalanced
          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
      }`}>
        <div className="flex items-center gap-2">
          {data.isBalanced ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
          <div>
            <div className="font-bold">
              {data.isBalanced ? "Trial Balance is in Balance" : "Trial Balance is Out of Balance"}
            </div>
            <div className="text-xs opacity-90">Total Debits must equal Total Credits across all general ledger accounts</div>
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs text-muted-foreground">Total: {formatMoney(data.totalDebits)}</div>
        </div>
      </div>

      {/* Printable Report Card */}
      <Card id="report-print-container" className="bg-card shadow-sm border">
        <CardHeader className="border-b bg-muted/20 pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">VinBook Financial Report</div>
          <CardTitle className="text-2xl font-bold tracking-tight">{organization.name}</CardTitle>
          <div className="text-lg font-semibold text-foreground">Trial Balance</div>
          <CardDescription>As of {asOfDate}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-24 font-bold">Code</TableHead>
                <TableHead className="font-bold">Account Name</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="text-right font-bold">Debit</TableHead>
                <TableHead className="text-right font-bold">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-mono text-xs font-semibold">{acc.code}</TableCell>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${getTypeBadge(acc.type)}`}>
                      {acc.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {acc.debit > 0 ? formatMoney(acc.debit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {acc.credit > 0 ? formatMoney(acc.credit) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {/* Grand Total Row */}
              <TableRow className="bg-muted/80 font-bold border-t-2">
                <TableCell colSpan={3} className="text-foreground font-extrabold">
                  TOTALS
                </TableCell>
                <TableCell className="text-right font-mono font-extrabold text-primary">
                  {formatMoney(data.totalDebits)}
                </TableCell>
                <TableCell className="text-right font-mono font-extrabold text-primary">
                  {formatMoney(data.totalCredits)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
