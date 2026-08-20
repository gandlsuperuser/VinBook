"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Banknote, RefreshCw } from "lucide-react";

interface CashFlowData {
  reportType: string;
  organization: { name: string };
  period: { startDate: string; endDate: string };
  currency: string;
  data: {
    operatingActivities: Array<{ description: string; amount: number }>;
    netOperatingCashFlow: number;
    investingActivities: Array<{ description: string; amount: number }>;
    netInvestingCashFlow: number;
    financingActivities: Array<{ description: string; amount: number }>;
    netFinancingCashFlow: number;
    netChangeInCash: number;
    beginningCash: number;
    endingCash: number;
  };
}

export function CashFlowView({ report }: { report: CashFlowData }) {
  const { data, organization, period } = report;
  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operating Cash Flow</CardTitle>
            <RefreshCw className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.netOperatingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatMoney(data.netOperatingCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Customer receipts minus expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Change in Cash</CardTitle>
            {data.netChangeInCash >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.netChangeInCash >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {data.netChangeInCash >= 0 ? `+${formatMoney(data.netChangeInCash)}` : formatMoney(data.netChangeInCash)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Over selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ending Cash Balance</CardTitle>
            <Banknote className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatMoney(data.endingCash)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total active bank accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report Card */}
      <Card id="report-print-container" className="bg-card shadow-sm border">
        <CardHeader className="border-b bg-muted/20 pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">VinBook Financial Report</div>
          <CardTitle className="text-2xl font-bold tracking-tight">{organization.name}</CardTitle>
          <div className="text-lg font-semibold text-foreground">Statement of Cash Flows</div>
          <CardDescription>
            For the period {period.startDate} to {period.endDate}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Operating Activities */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Operating Activities</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.operatingActivities.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-4 font-medium">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.amount < 0 ? `(${formatMoney(Math.abs(item.amount))})` : formatMoney(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell>Net Cash from Operating Activities</TableCell>
                  <TableCell className={`text-right font-mono ${data.netOperatingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatMoney(data.netOperatingCashFlow)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Investing Activities */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Investing Activities</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.investingActivities.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-4 font-medium">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell>Net Cash from Investing Activities</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(data.netInvestingCashFlow)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Financing Activities */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Financing Activities</h3>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            </div>
            <Table>
              <TableBody>
                {data.financingActivities.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-4 font-medium">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell>Net Cash from Financing Activities</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(data.netFinancingCashFlow)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Net Cash Summary */}
          <div className="rounded-lg border bg-muted/30 p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Beginning Cash Balance</span>
              <span className="font-mono font-medium">{formatMoney(data.beginningCash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Net Increase / (Decrease) in Cash</span>
              <span className={`font-mono font-bold ${data.netChangeInCash >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {data.netChangeInCash >= 0 ? `+${formatMoney(data.netChangeInCash)}` : formatMoney(data.netChangeInCash)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-3">
              <span>Ending Cash Balance</span>
              <span className="font-mono text-primary">{formatMoney(data.endingCash)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
