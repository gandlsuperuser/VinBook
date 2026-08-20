"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  Printer,
  BarChart3,
  Scale,
  Banknote,
  Clock,
  BookOpen,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { ProfitLossView } from "@/components/reports/profit-loss-view";
import { BalanceSheetView } from "@/components/reports/balance-sheet-view";
import { CashFlowView } from "@/components/reports/cash-flow-view";
import { ARAgingView } from "@/components/reports/ar-aging-view";
import { TrialBalanceView } from "@/components/reports/trial-balance-view";
import { TaxSummaryView } from "@/components/reports/tax-summary-view";
import { exportReportToPDF, exportToCSV } from "@/components/reports/report-export-utils";

type ReportType =
  | "profit-loss"
  | "balance-sheet"
  | "cash-flow"
  | "ar-aging"
  | "trial-balance"
  | "tax-summary";

type PeriodPreset =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "last-year"
  | "custom";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("profit-loss");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this-year");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [asOfDate, setAsOfDate] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);

  // Initialize dates based on preset
  const applyPreset = (preset: PeriodPreset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    let start = "";
    let end = "";

    switch (preset) {
      case "this-month":
        start = new Date(y, m, 1).toISOString().split("T")[0];
        end = new Date(y, m + 1, 0).toISOString().split("T")[0];
        break;
      case "last-month":
        start = new Date(y, m - 1, 1).toISOString().split("T")[0];
        end = new Date(y, m, 0).toISOString().split("T")[0];
        break;
      case "this-quarter": {
        const qStartMonth = Math.floor(m / 3) * 3;
        start = new Date(y, qStartMonth, 1).toISOString().split("T")[0];
        end = new Date(y, qStartMonth + 3, 0).toISOString().split("T")[0];
        break;
      }
      case "this-year":
        start = new Date(y, 0, 1).toISOString().split("T")[0];
        end = new Date(y, 11, 31).toISOString().split("T")[0];
        break;
      case "last-year":
        start = new Date(y - 1, 0, 1).toISOString().split("T")[0];
        end = new Date(y - 1, 11, 31).toISOString().split("T")[0];
        break;
      default:
        break;
    }

    if (start && end) {
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end);
    }
  };

  useEffect(() => {
    applyPreset("this-year");
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeReport });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (asOfDate) params.append("asOfDate", asOfDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load report data");
      }
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("Error fetching report:", err);
      alert("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [activeReport, startDate, endDate, asOfDate]);

  const handlePeriodChange = (val: PeriodPreset) => {
    setPeriodPreset(val);
    if (val !== "custom") {
      applyPreset(val);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const filename = `${activeReport}_report_${new Date().toISOString().split("T")[0]}`;
      await exportReportToPDF("report-print-container", filename);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData) return;
    const filename = `${activeReport}_${new Date().toISOString().split("T")[0]}`;

    if (activeReport === "profit-loss") {
      const headers = ["Section", "Category", "Amount ($)"];
      const rows: any[] = [];
      reportData.data.revenue.categories.forEach((r: any) =>
        rows.push(["Revenue", r.category, r.amount])
      );
      rows.push(["Revenue", "Total Revenue", reportData.data.revenue.totalRevenue]);
      reportData.data.cogs.categories.forEach((c: any) =>
        rows.push(["COGS", c.category, c.amount])
      );
      rows.push(["COGS", "Total COGS", reportData.data.cogs.amount]);
      rows.push(["Gross Profit", "Gross Profit", reportData.data.grossProfit]);
      reportData.data.expenses.categories.forEach((e: any) =>
        rows.push(["Operating Expense", e.category, e.amount])
      );
      rows.push(["Operating Expense", "Total Operating Expenses", reportData.data.expenses.totalOperatingExpenses]);
      rows.push(["Net Income", "Net Operating Income", reportData.data.netIncome]);
      exportToCSV(filename, headers, rows);
    } else if (activeReport === "balance-sheet") {
      const headers = ["Classification", "Item Name", "Amount ($)"];
      const rows: any[] = [];
      reportData.data.assets.currentAssets.forEach((a: any) =>
        rows.push(["Assets", a.name, a.amount])
      );
      rows.push(["Assets", "TOTAL ASSETS", reportData.data.assets.totalAssets]);
      reportData.data.liabilities.currentLiabilities.forEach((l: any) =>
        rows.push(["Liabilities", l.name, l.amount])
      );
      rows.push(["Liabilities", "TOTAL LIABILITIES", reportData.data.liabilities.totalLiabilities]);
      reportData.data.equity.items.forEach((eq: any) =>
        rows.push(["Equity", eq.name, eq.amount])
      );
      rows.push(["Equity", "TOTAL EQUITY", reportData.data.equity.totalEquity]);
      exportToCSV(filename, headers, rows);
    } else if (activeReport === "ar-aging") {
      const headers = ["Customer", "Current ($)", "1-30 Days ($)", "31-60 Days ($)", "90+ Days ($)", "Total Due ($)"];
      const rows = reportData.data.customers.map((c: any) => [
        c.customer.name,
        c.current,
        c.days30,
        c.days60,
        c.days90Plus,
        c.total,
      ]);
      rows.push([
        "TOTALS",
        reportData.data.summary.current,
        reportData.data.summary.days30,
        reportData.data.summary.days60,
        reportData.data.summary.days90Plus,
        reportData.data.summary.grandTotal,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (activeReport === "trial-balance") {
      const headers = ["Account Code", "Account Name", "Type", "Debit ($)", "Credit ($)"];
      const rows = reportData.data.accounts.map((a: any) => [
        a.code,
        a.name,
        a.type,
        a.debit,
        a.credit,
      ]);
      rows.push(["", "TOTALS", "", reportData.data.totalDebits, reportData.data.totalCredits]);
      exportToCSV(filename, headers, rows);
    } else if (activeReport === "tax-summary") {
      const headers = ["Invoice #", "Date", "Customer", "Subtotal ($)", "Tax ($)", "Total ($)"];
      const rows = reportData.data.invoices.map((i: any) => [
        i.number,
        i.date,
        i.customerName,
        i.subtotal,
        i.tax,
        i.total,
      ]);
      exportToCSV(filename, headers, rows);
    } else {
      const headers = ["Description", "Amount ($)"];
      const rows = [
        ["Operating Cash Flow", reportData.data.netOperatingCashFlow],
        ["Net Change in Cash", reportData.data.netChangeInCash],
        ["Ending Cash Balance", reportData.data.endingCash],
      ];
      exportToCSV(filename, headers, rows);
    }
  };

  const reportTabs = [
    { id: "profit-loss", name: "Profit & Loss", icon: BarChart3 },
    { id: "balance-sheet", name: "Balance Sheet", icon: Scale },
    { id: "cash-flow", name: "Cash Flow", icon: Banknote },
    { id: "ar-aging", name: "A/R Aging", icon: Clock },
    { id: "trial-balance", name: "Trial Balance", icon: BookOpen },
    { id: "tax-summary", name: "Sales Tax Summary", icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            Commercial financial statements, double-entry ledger summaries, and tax reporting
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={loading || !reportData}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            Export CSV
          </Button>
          <Button size="sm" onClick={handleExportPDF} disabled={loading || !reportData || exportingPDF}>
            <Download className="mr-2 h-4 w-4" />
            {exportingPDF ? "Generating PDF..." : "Download PDF Report"}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b pb-2 gap-2">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period:</span>
          <Select value={periodPreset} onValueChange={(v) => handlePeriodChange(v as PeriodPreset)}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year (YTD)</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date pickers */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">From</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPeriodPreset("custom");
            }}
            className="w-[145px] bg-background text-sm"
          />
          <span className="text-xs text-muted-foreground">To</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setAsOfDate(e.target.value);
              setPeriodPreset("custom");
            }}
            className="w-[145px] bg-background text-sm"
          />
        </div>

        <Button variant="ghost" size="sm" onClick={fetchReport} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Report Body */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-xl border bg-card text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-80" />
            <p className="text-sm font-medium">Generating financial statement...</p>
          </div>
        </div>
      ) : !reportData ? (
        <div className="flex h-96 items-center justify-center rounded-xl border bg-card text-muted-foreground">
          <p>No report data available. Please select a date range.</p>
        </div>
      ) : (
        <div>
          {activeReport === "profit-loss" && <ProfitLossView report={reportData} />}
          {activeReport === "balance-sheet" && <BalanceSheetView report={reportData} />}
          {activeReport === "cash-flow" && <CashFlowView report={reportData} />}
          {activeReport === "ar-aging" && <ARAgingView report={reportData} />}
          {activeReport === "trial-balance" && <TrialBalanceView report={reportData} />}
          {activeReport === "tax-summary" && <TaxSummaryView report={reportData} />}
        </div>
      )}
    </div>
  );
}
