"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, AlertCircle } from "lucide-react";

interface ARAgingData {
  reportType: string;
  organization: { name: string };
  asOfDate: string;
  currency: string;
  data: {
    customers: Array<{
      customer: { id: string; name: string; email: string | null; phone: string | null };
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
      total: number;
      invoices: Array<{
        id: string;
        number: string;
        date: string;
        dueDate: string;
        daysPastDue: number;
        total: number;
        paid: number;
        outstanding: number;
      }>;
    }>;
    summary: {
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
      grandTotal: number;
    };
  };
}

export function ARAgingView({ report }: { report: ARAgingData }) {
  const { data, organization, asOfDate } = report;
  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Current (0-30d)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-emerald-600">{formatMoney(data.summary.current)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Not overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">1-30 Days Past Due</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-blue-600">{formatMoney(data.summary.days30)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Recently overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">31-60 Days Past Due</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-amber-600">{formatMoney(data.summary.days60)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Follow up required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">90+ Days Past Due</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-rose-600">{formatMoney(data.summary.days90Plus)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Critical collections</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-primary">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-extrabold text-primary">{formatMoney(data.summary.grandTotal)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total uncollected</p>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report Card */}
      <Card id="report-print-container" className="bg-card shadow-sm border">
        <CardHeader className="border-b bg-muted/20 pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">VinBook Financial Report</div>
          <CardTitle className="text-2xl font-bold tracking-tight">{organization.name}</CardTitle>
          <div className="text-lg font-semibold text-foreground">Accounts Receivable (A/R) Aging Summary</div>
          <CardDescription>As of {asOfDate}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          {data.customers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No outstanding invoices found</p>
              <p className="text-xs">All invoices are paid in full or currently in draft.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="text-right font-bold">Current</TableHead>
                  <TableHead className="text-right font-bold">1 - 30 Days</TableHead>
                  <TableHead className="text-right font-bold">31 - 60 Days</TableHead>
                  <TableHead className="text-right font-bold">&gt; 90 Days</TableHead>
                  <TableHead className="text-right font-bold">Total Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customers.map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-medium">{c.customer.name}</div>
                      {c.customer.email && (
                        <div className="text-xs text-muted-foreground">{c.customer.email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">
                      {c.current > 0 ? formatMoney(c.current) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-600">
                      {c.days30 > 0 ? formatMoney(c.days30) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      {c.days60 > 0 ? formatMoney(c.days60) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-rose-600">
                      {c.days90Plus > 0 ? formatMoney(c.days90Plus) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatMoney(c.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Summary Row */}
                <TableRow className="bg-muted/80 font-bold border-t-2">
                  <TableCell className="text-foreground">TOTAL RECEIVABLES</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {formatMoney(data.summary.current)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-blue-600">
                    {formatMoney(data.summary.days30)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-600">
                    {formatMoney(data.summary.days60)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-rose-600">
                    {formatMoney(data.summary.days90Plus)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-primary font-extrabold">
                    {formatMoney(data.summary.grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
