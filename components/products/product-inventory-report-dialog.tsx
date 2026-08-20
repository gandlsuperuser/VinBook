"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Download,
  FileSpreadsheet,
  Plus,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  Loader2,
  Calendar,
  Layers,
  MapPin,
  Tag,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { exportToCSV } from "@/components/reports/report-export-utils";
import jsPDFImport from "jspdf";
import html2canvas from "html2canvas";

const jsPDF = (jsPDFImport as any).jsPDF || jsPDFImport;

interface ProductInventoryReportDialogProps {
  productId: string | null;
  productName?: string;
  isOpen: boolean;
  onClose: () => void;
  onInventoryUpdated?: () => void;
}

export function ProductInventoryReportDialog({
  productId,
  productName,
  isOpen,
  onClose,
  onInventoryUpdated,
}: ProductInventoryReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [datePreset, setDatePreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"movements" | "customers" | "addStock">("movements");
  const [exportingPDF, setExportingPDF] = useState(false);

  // Quick Add Stock Form state
  const [stockQty, setStockQty] = useState<string>("");
  const [stockType, setStockType] = useState<string>("ADDED");
  const [stockRef, setStockRef] = useState<string>("");
  const [stockNotes, setStockNotes] = useState<string>("");
  const [stockPerformer, setStockPerformer] = useState<string>("");
  const [stockUnitCost, setStockUnitCost] = useState<string>("");
  const [submittingStock, setSubmittingStock] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockSuccess, setStockSuccess] = useState("");
  const [fetchError, setFetchError] = useState("");

  const fetchReport = async () => {
    if (!productId) return;
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/products/${productId}/report?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch product report");
      }
      setData(result);
    } catch (err: any) {
      console.error("Error loading product report:", err);
      setFetchError(err.message || "Failed to load product report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && productId) {
      fetchReport();
    } else {
      setData(null);
      setActiveTab("movements");
      setStockSuccess("");
      setStockError("");
      setFetchError("");
    }
  }, [isOpen, productId, startDate, endDate]);

  const handlePresetChange = (val: string) => {
    setDatePreset(val);
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().split("T")[0];

    switch (val) {
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(formatYMD(start));
        setEndDate(formatYMD(end));
        break;
      }
      case "last_30_days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        setStartDate(formatYMD(start));
        setEndDate(formatYMD(now));
        break;
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        setStartDate(formatYMD(start));
        setEndDate(formatYMD(end));
        break;
      }
      case "all":
      default:
        setStartDate("");
        setEndDate("");
        break;
    }
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !stockQty) return;
    setSubmittingStock(true);
    setStockError("");
    setStockSuccess("");

    try {
      const res = await fetch(`/api/products/${productId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD",
          type: stockType,
          quantity: parseInt(stockQty),
          reference: stockRef || undefined,
          notes: stockNotes || undefined,
          performedBy: stockPerformer || undefined,
          unitCost: stockUnitCost ? parseFloat(stockUnitCost) : undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to add inventory");
      }

      setStockSuccess(`Successfully added ${stockQty} units to inventory!`);
      setStockQty("");
      setStockRef("");
      setStockNotes("");
      setStockUnitCost("");
      fetchReport();
      if (onInventoryUpdated) onInventoryUpdated();
      setTimeout(() => {
        setActiveTab("movements");
      }, 1200);
    } catch (err: any) {
      setStockError(err.message || "Failed to add stock");
    } finally {
      setSubmittingStock(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      "Date",
      "Event Type",
      "Reference",
      "Party (Customer / Vendor)",
      "Handled By / Sales Rep",
      "Side Mark / Jobsite",
      "Ship / Deliver To",
      "Quantity Change",
      "Unit Price ($)",
      "Total Amount ($)",
      "Status",
    ];

    const rows = data.movements.map((m: any) => [
      new Date(m.date).toLocaleDateString(),
      m.typeLabel,
      m.reference,
      m.partyName,
      m.handledBy || "-",
      m.sideMark || "-",
      m.shipTo || "-",
      m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange,
      m.unitPrice.toFixed(2),
      m.totalAmount.toFixed(2),
      m.status || "Completed",
    ]);

    exportToCSV(
      `${data.product.name.replace(/\s+/g, "_")}_Movement_Report`,
      headers,
      rows
    );
  };

  const handleExportPDF = async () => {
    if (!data) return;
    setExportingPDF(true);
    try {
      const printableElement = document.getElementById("product-report-printable");
      if (!printableElement) return;

      const canvas = await html2canvas(printableElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      const imgPdfHeight = pdfWidth / ratio;
      let heightLeft = imgPdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${data.product.name.replace(/\s+/g, "_")}_Inventory_Report.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF report");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 bg-white dark:bg-zinc-950">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {data?.product?.name || productName || "Product Inventory Report"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                  {data?.product?.sku && (
                    <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-medium">
                      SKU: {data.product.sku}
                    </span>
                  )}
                  {data?.product?.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" /> {data.product.category}
                    </span>
                  )}
                  {data?.product?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {data.product.location}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Actions: Export PDF, CSV, Add Stock */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("addStock")}
                className="text-xs gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add / Restock Stock
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={!data || data.movements.length === 0}
                className="text-xs gap-1.5"
                title="Export report as CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={!data || exportingPDF}
                className="text-xs gap-1.5"
                title="Download printable PDF Report"
              >
                {exportingPDF ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                )}
                PDF Report
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading product movement history...</p>
          </div>
        ) : fetchError ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-sm max-w-md border border-red-200 dark:border-red-900">
              {fetchError}
            </div>
            <Button size="sm" variant="outline" onClick={fetchReport} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No report data available.
          </div>
        ) : (
          <div className="space-y-5 mt-3">
            {/* Printable Container for PDF capture */}
            <div id="product-report-printable" className="space-y-5 p-1 bg-white dark:bg-zinc-950">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center justify-between">
                    <span>Current In Stock</span>
                    <Package className="h-3.5 w-3.5 opacity-70" />
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data.summary.currentStock}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {data.summary.unit}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Valued at ${(data.summary.estimatedInventoryValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                    <span>Total Units Added</span>
                    <ArrowDownRight className="h-3.5 w-3.5 opacity-70 text-emerald-600" />
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    +{data.summary.totalUnitsAdded}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {data.summary.unit}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Initial + Restocks
                  </div>
                </div>

                <div className="rounded-xl border border-orange-200/80 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/30 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300 flex items-center justify-between">
                    <span>Total Units Sold</span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70 text-orange-600" />
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {data.summary.totalUnitsSold}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {data.summary.unit}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Across {data.summary.customerCount} customer{data.summary.customerCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="rounded-xl border border-purple-200/80 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/30 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center justify-between">
                    <span>Total Revenue</span>
                    <DollarSign className="h-3.5 w-3.5 opacity-70 text-purple-600" />
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    ${data.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Price: ${data.summary.unitPrice.toLocaleString()} | Cost: ${data.summary.unitCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs and Date Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t">
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab("movements")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === "movements"
                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Inventory & Sales Movement ({data.movements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customers")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === "customers"
                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sold To Customers ({data.topCustomers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("addStock")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === "addStock"
                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    + Record Stock Addition
                  </button>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2">
                  <Select value={datePreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="Date filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Dates</SelectItem>
                    </SelectContent>
                  </Select>

                  {datePreset === "custom" && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-[130px] text-xs bg-white dark:bg-zinc-900"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-[130px] text-xs bg-white dark:bg-zinc-900"
                      />
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchReport}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Refresh report"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tab 1: Unified Movement History (When Added, When Picked up / Sold to who) */}
              {activeTab === "movements" && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Event / Type</TableHead>
                        <TableHead className="text-xs font-semibold">Reference</TableHead>
                        <TableHead className="text-xs font-semibold">Party (Sold To / Added From)</TableHead>
                        <TableHead className="text-xs font-semibold">Handled By / Rep</TableHead>
                        <TableHead className="text-xs font-semibold">Side Mark / Jobsite</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Rate / Cost</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.movements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                            No inventory or sales movements found for this time period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.movements.map((m: any) => {
                          const isAddition = m.quantityChange > 0;
                          return (
                            <TableRow key={m.id} className="text-xs">
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Date(m.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    isAddition
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  }`}
                                >
                                  {isAddition ? (
                                    <ArrowDownRight className="mr-1 h-3 w-3" />
                                  ) : (
                                    <ArrowUpRight className="mr-1 h-3 w-3" />
                                  )}
                                  {m.typeLabel}
                                </span>
                              </TableCell>
                              <TableCell>
                                {m.referenceId ? (
                                  <Link
                                    href={`/dashboard/invoices/${m.referenceId}`}
                                    className="font-semibold text-primary hover:underline hover:text-blue-600 transition-colors"
                                  >
                                    {m.reference}
                                  </Link>
                                ) : (
                                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                    {m.reference}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {m.partyName}
                                </div>
                                {m.partyContact && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {m.partyContact}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {m.handledBy ? (
                                  <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                                    {m.handledBy}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[180px]">
                                {m.sideMark ? (
                                  <span
                                    className="text-[11px] font-mono text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded px-1.5 py-0.5 block truncate"
                                    title={m.sideMark}
                                  >
                                    {m.sideMark}
                                  </span>
                                ) : m.shipTo ? (
                                  <span
                                    className="text-[11px] text-muted-foreground block truncate"
                                    title={m.shipTo}
                                  >
                                    📍 {m.shipTo.split("\n")[0]}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                <span
                                  className={
                                    isAddition
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : "text-zinc-900 dark:text-zinc-100"
                                  }
                                >
                                  {isAddition ? `+${m.quantityChange}` : m.quantityChange}{" "}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    {data.product.unit}
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${m.unitPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                ${m.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Tab 2: Sold To Customers Breakdown */}
              {activeTab === "customers" && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Customer</TableHead>
                        <TableHead className="text-xs font-semibold">Contact Info</TableHead>
                        <TableHead className="text-xs font-semibold">Sales Rep(s)</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Invoices</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total Units Picked Up / Sold</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total Revenue</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Last Purchase Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                            No customer sales recorded for this product yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.topCustomers.map((c: any) => (
                          <TableRow key={c.customerId} className="text-xs">
                            <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                              <Link
                                href={`/dashboard/customers/${c.customerId}`}
                                className="hover:underline hover:text-primary"
                              >
                                {c.customerName}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {c.customerPhone || c.customerEmail || "-"}
                            </TableCell>
                            <TableCell>
                              {c.salesReps.length > 0 ? (
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {c.salesReps.join(", ")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium">
                              {c.invoiceCount}
                            </TableCell>
                            <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">
                              {c.totalUnits} {data.product.unit}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${c.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                              {new Date(c.lastOrderDate).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Tab 3: Record Stock Addition / Restock Form */}
            {activeTab === "addStock" && (
              <form
                onSubmit={handleAddStockSubmit}
                className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/20 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                      Record Incoming Inventory / Restock
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Log when inventory is received from suppliers or added to warehouse stock
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Current Stock: {data.product.inventory ?? 0} {data.product.unit}
                  </span>
                </div>

                {stockError && (
                  <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                    {stockError}
                  </div>
                )}
                {stockSuccess && (
                  <div className="p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                    {stockSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stockQty" className="text-xs">
                      Quantity to Add *
                    </Label>
                    <Input
                      id="stockQty"
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      required
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="stockType" className="text-xs">
                      Reason / Event Type
                    </Label>
                    <Select value={stockType} onValueChange={setStockType}>
                      <SelectTrigger className="bg-white dark:bg-zinc-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADDED">Stock Received / Added</SelectItem>
                        <SelectItem value="RESTOCK">Restock Shipment</SelectItem>
                        <SelectItem value="ADJUSTMENT">Inventory Audit Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="stockUnitCost" className="text-xs">
                      Unit Cost ($)
                    </Label>
                    <Input
                      id="stockUnitCost"
                      type="number"
                      step="0.01"
                      placeholder={`Current cost: $${data.product.cost}`}
                      value={stockUnitCost}
                      onChange={(e) => setStockUnitCost(e.target.value)}
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="stockRef" className="text-xs">
                      Reference / Batch / PO #
                    </Label>
                    <Input
                      id="stockRef"
                      placeholder="e.g. PO-78921 / Supplier Invoice #440"
                      value={stockRef}
                      onChange={(e) => setStockRef(e.target.value)}
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="stockPerformer" className="text-xs">
                      Handled By / Vendor / Staff
                    </Label>
                    <Input
                      id="stockPerformer"
                      placeholder="e.g. Warehouse Receiving / Li Mo"
                      value={stockPerformer}
                      onChange={(e) => setStockPerformer(e.target.value)}
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="stockNotes" className="text-xs">
                      Notes / Warehouse Location
                    </Label>
                    <Input
                      id="stockNotes"
                      placeholder="e.g. Aisle 4, Box 12, Restock batch"
                      value={stockNotes}
                      onChange={(e) => setStockNotes(e.target.value)}
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("movements")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingStock || !stockQty}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submittingStock ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1.5" />
                    )}
                    Save Stock Entry
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
