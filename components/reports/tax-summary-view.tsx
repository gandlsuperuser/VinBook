"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, DollarSign, ShieldAlert } from "lucide-react";

interface TaxSummaryData {
  reportType: string;
  organization: { name: string };
  period: { startDate: string; endDate: string };
  currency: string;
  data: {
    grossSales: number;
    taxableSales: number;
    nonTaxableSales: number;
    taxCollected: number;
    invoices: Array<{
      id: string;
      number: string;
      date: string;
      customerName: string;
      subtotal: number;
      tax: number;
      total: number;
    }>;
  };
}

export function TaxSummaryView({ report }: { report: TaxSummaryData }) {
  const { data, organization, period } = report;
  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatMoney(data.grossSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total invoiced sales volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxable Sales</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatMoney(data.taxableSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sales subject to sales tax</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Non-Taxable Sales</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{formatMoney(data.nonTaxableSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Exempt / zero tax sales</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-primary">Sales Tax Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-primary">{formatMoney(data.taxCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total tax liability owed</p>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report Card */}
      <Card id="report-print-container" className="bg-card shadow-sm border">
        <CardHeader className="border-b bg-muted/20 pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">VinBook Financial Report</div>
          <CardTitle className="text-2xl font-bold tracking-tight">{organization.name}</CardTitle>
          <div className="text-lg font-semibold text-foreground">Sales Tax Liability Summary</div>
          <CardDescription>
            For the period {period.startDate} to {period.endDate}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          {data.invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="font-medium">No sales invoices found for this tax period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Invoice #</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="text-right font-bold">Subtotal</TableHead>
                  <TableHead className="text-right font-bold">Tax Collected</TableHead>
                  <TableHead className="text-right font-bold">Invoice Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">{inv.number}</TableCell>
                    <TableCell>{inv.date}</TableCell>
                    <TableCell className="font-medium">{inv.customerName}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(inv.subtotal)}</TableCell>
                    <TableCell className="text-right font-mono text-primary font-semibold">
                      {formatMoney(inv.tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatMoney(inv.total)}</TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/80 font-bold border-t-2">
                  <TableCell colSpan={3} className="text-foreground">
                    TOTALS
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(data.taxableSales + data.nonTaxableSales)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-primary font-extrabold">
                    {formatMoney(data.taxCollected)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-extrabold">
                    {formatMoney(data.grossSales)}
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
