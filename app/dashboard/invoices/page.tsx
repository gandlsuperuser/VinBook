"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Pencil, Package, Loader2, GripVertical, RotateCcw, Settings2, Calendar, AlertCircle, FileText } from "lucide-react";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { InvoiceStatus } from "@prisma/client";
import { downloadPackingListPDF } from "@/lib/packing-list-pdf";
import { useLanguage } from "@/components/providers/language-context";

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  total: number;
  poNumber?: string | null;
  sideMark?: string | null;
  salesRep?: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  payments: Array<{ amount: number }>;
}

interface InvoiceSummary {
  totalCount: number;
  totalAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

export type ColumnId =
  | "date"
  | "number"
  | "customer"
  | "sideMark"
  | "status"
  | "amount"
  | "dueDate"
  | "poNumber"
  | "salesRep"
  | "balance"
  | "actions";

interface ColumnDefinition {
  id: ColumnId;
  defaultVisible: boolean;
  align?: "left" | "right";
}

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: "date", defaultVisible: true, align: "left" },
  { id: "number", defaultVisible: true, align: "left" },
  { id: "customer", defaultVisible: true, align: "left" },
  { id: "sideMark", defaultVisible: true, align: "left" },
  { id: "status", defaultVisible: true, align: "left" },
  { id: "amount", defaultVisible: true, align: "right" },
  { id: "dueDate", defaultVisible: false, align: "left" },
  { id: "poNumber", defaultVisible: false, align: "left" },
  { id: "salesRep", defaultVisible: false, align: "left" },
  { id: "balance", defaultVisible: false, align: "right" },
  { id: "actions", defaultVisible: true, align: "right" },
];

function formatLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "-";
  if (typeof dateVal === "string") {
    const clean = dateVal.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
    }
  }
  const d = new Date(dateVal);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function getDateRangeForPreset(
  preset: string,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  const now = new Date();

  switch (preset) {
    case "today": {
      const todayStr = formatLocalYMD(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const str = formatLocalYMD(yesterday);
      return { startDate: str, endDate: str };
    }
    case "this_week": {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return { startDate: formatLocalYMD(startOfWeek), endDate: formatLocalYMD(now) };
    }
    case "last_week": {
      const startOfLastWeek = new Date(now);
      const day = startOfLastWeek.getDay();
      const diff = startOfLastWeek.getDate() - day - 6;
      startOfLastWeek.setDate(diff);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return { startDate: formatLocalYMD(startOfLastWeek), endDate: formatLocalYMD(endOfLastWeek) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }
    case "last_30_days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(now) };
    }
    case "this_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const end = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }
    case "last_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      const end = new Date(now.getFullYear(), (currentQuarter - 1) * 3 + 3, 0);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }
    case "last_3_months": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(now) };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }
    case "last_year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }
    case "last_12_months": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 12);
      return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(now) };
    }
    case "custom": {
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      };
    }
    case "all":
    default:
      return {};
  }
}

export default function InvoicesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    totalCount: 0,
    totalAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [generatingPackingListId, setGeneratingPackingListId] = useState<string | null>(null);

  // Dynamic movable and customizable columns state
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() =>
    ALL_COLUMNS.map((c) => c.id)
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
  );
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);

  const getColumnLabel = (id: ColumnId): string => {
    switch (id) {
      case "date": return t("columns.date");
      case "number": return t("columns.number");
      case "customer": return t("columns.customer");
      case "sideMark": return t("columns.sideMark");
      case "status": return t("columns.status");
      case "amount": return t("columns.amount");
      case "dueDate": return t("columns.dueDate");
      case "poNumber": return t("columns.poNumber");
      case "salesRep": return t("columns.salesRep");
      case "balance": return t("columns.balance");
      case "actions": return t("columns.actions");
      default: return id;
    }
  };

  // Load configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vinbook_invoices_columns_config_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.order) && Array.isArray(parsed.visible)) {
          const mergedOrder: ColumnId[] = [];
          parsed.order.forEach((id: ColumnId) => {
            if (ALL_COLUMNS.some((c) => c.id === id)) mergedOrder.push(id);
          });
          ALL_COLUMNS.forEach((c) => {
            if (!mergedOrder.includes(c.id)) mergedOrder.push(c.id);
          });

          setColumnOrder(mergedOrder);
          setVisibleColumns(new Set(parsed.visible));
        }
      }
    } catch {
      // fallback
    }
  }, []);

  // Save configuration to localStorage
  const saveColumnConfig = (order: ColumnId[], visible: Set<ColumnId>) => {
    try {
      localStorage.setItem(
        "vinbook_invoices_columns_config_v2",
        JSON.stringify({
          order,
          visible: Array.from(visible),
        })
      );
    } catch (e) {
      console.error("Failed to save column settings:", e);
    }
  };

  const toggleColumnVisibility = (colId: ColumnId) => {
    const updated = new Set(visibleColumns);
    if (updated.has(colId)) {
      if (updated.size <= 1) return;
      updated.delete(colId);
    } else {
      updated.add(colId);
    }
    setVisibleColumns(updated);
    saveColumnConfig(columnOrder, updated);
  };

  const resetColumnsToDefault = () => {
    const defaultOrder = ALL_COLUMNS.map((c) => c.id);
    const defaultVisible = new Set(
      ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
    );
    setColumnOrder(defaultOrder);
    setVisibleColumns(defaultVisible);
    saveColumnConfig(defaultOrder, defaultVisible);
  };

  // Drag & drop column reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.setData("text/plain", `${index}`);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColIndex !== index) {
      setDragOverColIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverColIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverColIndex(null);
    if (draggedColIndex === null || draggedColIndex === targetIndex) {
      setDraggedColIndex(null);
      return;
    }

    const currentVisibleCols = columnOrder.filter((id) => visibleColumns.has(id));
    const draggedColId = currentVisibleCols[draggedColIndex];
    const targetColId = currentVisibleCols[targetIndex];

    const fullDraggedIndex = columnOrder.indexOf(draggedColId);
    const fullTargetIndex = columnOrder.indexOf(targetColId);

    const newOrder = [...columnOrder];
    newOrder.splice(fullDraggedIndex, 1);
    newOrder.splice(fullTargetIndex, 0, draggedColId);

    setColumnOrder(newOrder);
    setDraggedColIndex(null);
    saveColumnConfig(newOrder, visibleColumns);
  };

  const activeVisibleColumns = columnOrder
    .map((id) => ALL_COLUMNS.find((c) => c.id === id)!)
    .filter((col) => col && visibleColumns.has(col.id));

  const isCustomized =
    columnOrder.some((id, idx) => id !== ALL_COLUMNS[idx]?.id) ||
    visibleColumns.size !== ALL_COLUMNS.filter((c) => c.defaultVisible).length ||
    !ALL_COLUMNS.filter((c) => c.defaultVisible).every((c) => visibleColumns.has(c.id));

  const handleDownloadPackingList = async (invoiceId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setGeneratingPackingListId(invoiceId);
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      const data = await res.json();
      await downloadPackingListPDF(data.invoice || data);
    } catch (error) {
      console.error("Error generating packing list:", error);
      alert(`Failed to generate packing list: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGeneratingPackingListId(null);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=1000");
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (customerFilter !== "all") params.append("customerId", customerFilter);

      const dateRange = getDateRangeForPreset(
        dateFilter,
        customStartDate,
        customEndDate
      );
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const response = await fetch(`/api/invoices?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, search, statusFilter, customerFilter, dateFilter, customStartDate, customEndDate]);

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchInvoices();
      } else {
        alert("Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case InvoiceStatus.SENT:
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case InvoiceStatus.PARTIAL:
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case InvoiceStatus.OVERDUE:
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      case InvoiceStatus.DRAFT:
        return "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
      case InvoiceStatus.CANCELLED:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-300";
    }
  };

  const getStatusLabel = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID: return t("invoices.statusPaid");
      case InvoiceStatus.SENT: return t("invoices.statusSent");
      case InvoiceStatus.PARTIAL: return t("invoices.statusPartial");
      case InvoiceStatus.OVERDUE: return t("invoices.statusOverdue");
      case InvoiceStatus.DRAFT: return t("invoices.statusDraft");
      case InvoiceStatus.CANCELLED: return t("invoices.statusCancelled");
      default: return status;
    }
  };

  const calculateBalance = (invoice: Invoice) => {
    const totalPaid = (invoice.payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    return Number(invoice.total || 0) - totalPaid;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-muted-foreground">
            {t("invoices.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingInvoice(null)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("invoices.newInvoice")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? t("invoices.editInvoice") : t("invoices.newInvoice")}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice
                  ? "Update invoice details"
                  : "Fill in the details to create a new commercial invoice"}
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              invoice={editingInvoice || undefined}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingInvoice(null);
                fetchInvoices();
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingInvoice(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {t("invoices.totalInvoiced")}
            </span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">
            ${summary.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.totalCount} {t("invoices.invoicesInFilter")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800 dark:text-red-300">
              {t("invoices.overdueInvoices")}
            </span>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-900 dark:text-red-100">
            ${summary.overdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
            {summary.overdueCount} {t("invoices.requiresAttention")}
          </p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("common.dateRange")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("datePresets.all")}</SelectItem>
                <SelectItem value="today">{t("datePresets.today")}</SelectItem>
                <SelectItem value="yesterday">{t("datePresets.yesterday")}</SelectItem>
                <SelectItem value="this_week">{t("datePresets.this_week")}</SelectItem>
                <SelectItem value="last_week">{t("datePresets.last_week")}</SelectItem>
                <SelectItem value="this_month">{t("datePresets.this_month")}</SelectItem>
                <SelectItem value="last_month">{t("datePresets.last_month")}</SelectItem>
                <SelectItem value="last_30_days">{t("datePresets.last_30_days")}</SelectItem>
                <SelectItem value="this_quarter">{t("datePresets.this_quarter")}</SelectItem>
                <SelectItem value="last_quarter">{t("datePresets.last_quarter")}</SelectItem>
                <SelectItem value="last_3_months">{t("datePresets.last_3_months")}</SelectItem>
                <SelectItem value="this_year">{t("datePresets.this_year")}</SelectItem>
                <SelectItem value="last_year">{t("datePresets.last_year")}</SelectItem>
                <SelectItem value="last_12_months">{t("datePresets.last_12_months")}</SelectItem>
                <SelectItem value="custom">{t("datePresets.custom")}</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-9 w-[140px]"
                  placeholder="Start Date"
                />
                <span className="text-muted-foreground text-xs">{t("common.to")}</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-9 w-[140px]"
                  placeholder="End Date"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Date Presets Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50 text-xs">
          <span className="text-muted-foreground mr-1 text-[11px] uppercase tracking-wider font-semibold">
            {t("common.quick")}
          </span>
          {[
            { key: "all", label: t("datePresets.all") },
            { key: "this_month", label: t("datePresets.this_month") },
            { key: "last_month", label: t("datePresets.last_month") },
            { key: "this_quarter", label: t("datePresets.this_quarter") },
            { key: "this_year", label: t("datePresets.this_year") },
            { key: "last_30_days", label: t("datePresets.last_30_days") },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setDateFilter(preset.key)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                dateFilter === preset.key
                  ? "bg-primary text-primary-foreground font-medium shadow-xs"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("invoices.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatuses")}</SelectItem>
              <SelectItem value="DRAFT">{t("invoices.statusDraft")}</SelectItem>
              <SelectItem value="SENT">{t("invoices.statusSent")}</SelectItem>
              <SelectItem value="PAID">{t("invoices.statusPaid")}</SelectItem>
              <SelectItem value="PARTIAL">{t("invoices.statusPartial")}</SelectItem>
              <SelectItem value="OVERDUE">{t("invoices.statusOverdue")}</SelectItem>
              <SelectItem value="CANCELLED">{t("invoices.statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("common.customer")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allCustomers")}</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gear Icon: Customize & Reorder Columns */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 px-3 gap-2 cursor-pointer ${
                  isCustomized
                    ? "border-primary/50 text-primary bg-primary/5"
                    : "text-muted-foreground"
                }`}
                title={t("columns.dragToReorder")}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("common.columns")}</span>
                {isCustomized && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("columns.visibleColumns")}
                </DropdownMenuLabel>
                {isCustomized && (
                  <button
                    onClick={resetColumnsToDefault}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    title={t("columns.reset")}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("columns.reset")}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground px-2 pb-2 leading-relaxed">
                {t("columns.dragToReorder")}
              </p>
              <DropdownMenuSeparator />
              <div className="space-y-1 py-1">
                {ALL_COLUMNS.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={visibleColumns.has(col.id)}
                    onCheckedChange={() => toggleColumnVisibility(col.id)}
                    className="text-sm cursor-pointer"
                  >
                    {getColumnLabel(col.id)}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invoices Table with Drag-to-Reorder Headers */}
      <div className="rounded-md border bg-card overflow-x-auto shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {activeVisibleColumns.map((col, index) => {
                const isActions = col.id === "actions";
                const isDragOver = dragOverColIndex === index;
                const isDragging = draggedColIndex === index;

                return (
                  <TableHead
                    key={col.id}
                    draggable={!isActions}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`select-none transition-colors ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${
                      !isActions
                        ? "cursor-grab active:cursor-grabbing hover:bg-muted/80"
                        : ""
                    } ${
                      isDragOver
                        ? "border-l-2 border-primary bg-primary/10"
                        : ""
                    } ${isDragging ? "opacity-40" : ""}`}
                    title={!isActions ? t("columns.dragToReorder") : undefined}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === "right" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isActions && (
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                        {getColumnLabel(col.id)}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={activeVisibleColumns.length}
                  className="text-center py-10"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeVisibleColumns.length}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t("common.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/40 transition-colors">
                  {activeVisibleColumns.map((col) => {
                    switch (col.id) {
                      case "date":
                        return (
                          <TableCell key={col.id} className="font-medium whitespace-nowrap">
                            {formatDateDisplay(invoice.date)}
                          </TableCell>
                        );

                      case "number":
                        return (
                          <TableCell key={col.id} className="font-medium whitespace-nowrap">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="font-semibold text-primary hover:underline hover:text-blue-600 transition-colors inline-block"
                            >
                              {invoice.number}
                            </Link>
                            {invoice.poNumber && !visibleColumns.has("poNumber") && (
                              <div className="text-xs text-muted-foreground font-mono">
                                PO: {invoice.poNumber}
                              </div>
                            )}
                          </TableCell>
                        );

                      case "customer":
                        return (
                          <TableCell key={col.id} className="font-medium">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{invoice.customer.name}</div>
                            {invoice.salesRep && !visibleColumns.has("salesRep") && (
                              <div className="text-xs text-muted-foreground">
                                Rep: {invoice.salesRep}
                              </div>
                            )}
                          </TableCell>
                        );

                      case "sideMark":
                        return (
                          <TableCell key={col.id} className="max-w-[220px]">
                            {invoice.sideMark ? (
                              <span
                                className="text-xs font-mono text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded px-2 py-0.5 inline-block truncate max-w-full"
                                title={invoice.sideMark}
                              >
                                {invoice.sideMark}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        );

                      case "dueDate": {
                        const isOverdue =
                          invoice.status !== InvoiceStatus.PAID &&
                          new Date(invoice.dueDate) < new Date();
                        return (
                          <TableCell key={col.id}>
                            {isOverdue ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                                  {formatDateDisplay(invoice.dueDate)}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                                  {t("invoices.overdue")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                {formatDateDisplay(invoice.dueDate)}
                              </span>
                            )}
                          </TableCell>
                        );
                      }

                      case "poNumber":
                        return (
                          <TableCell key={col.id} className="text-xs font-mono">
                            {invoice.poNumber || "-"}
                          </TableCell>
                        );

                      case "salesRep":
                        return (
                          <TableCell key={col.id} className="text-xs">
                            {invoice.salesRep || "-"}
                          </TableCell>
                        );

                      case "status":
                        return (
                          <TableCell key={col.id}>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(
                                invoice.status
                              )}`}
                            >
                              {getStatusLabel(invoice.status)}
                            </span>
                          </TableCell>
                        );

                      case "amount":
                        return (
                          <TableCell key={col.id} className="text-right font-semibold whitespace-nowrap">
                            ${Number(invoice.total).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        );

                      case "balance": {
                        const balance = calculateBalance(invoice);
                        return (
                          <TableCell key={col.id} className="text-right font-medium whitespace-nowrap">
                            ${balance.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        );
                      }

                      case "actions":
                        return (
                          <TableCell key={col.id} className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title={t("common.view")}
                              >
                                <Link href={`/dashboard/invoices/${invoice.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDownloadPackingList(invoice.id, e)}
                                disabled={generatingPackingListId === invoice.id}
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                title={t("common.packingList")}
                              >
                                {generatingPackingListId === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                ) : (
                                  <Package className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title={t("common.delete")}
                              >
                                <Pencil className="h-4 w-4 sr-only" />
                                <span className="text-xs">✕</span>
                              </Button>
                            </div>
                          </TableCell>
                        );

                      default:
                        return <TableCell key={col.id}>-</TableCell>;
                    }
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t("common.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("common.page")} {page} {t("common.of")} {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("common.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
