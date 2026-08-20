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
import { Plus, Search, Eye, Pencil, Package, Loader2, GripVertical, RotateCcw, Settings } from "lucide-react";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { InvoiceStatus } from "@prisma/client";
import { downloadPackingListPDF } from "@/lib/packing-list-pdf";

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
  label: string;
  defaultVisible: boolean;
  align?: "left" | "right";
}

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: "date", label: "Date", defaultVisible: true, align: "left" },
  { id: "number", label: "Invoice #", defaultVisible: true, align: "left" },
  { id: "customer", label: "Customer", defaultVisible: true, align: "left" },
  { id: "sideMark", label: "Side Mark", defaultVisible: true, align: "left" },
  { id: "status", label: "Status", defaultVisible: true, align: "left" },
  { id: "amount", label: "Amount", defaultVisible: true, align: "right" },
  { id: "dueDate", label: "Due Date", defaultVisible: false, align: "left" },
  { id: "poNumber", label: "PO Number", defaultVisible: false, align: "left" },
  { id: "salesRep", label: "Sales Rep", defaultVisible: false, align: "left" },
  { id: "balance", label: "Balance Due", defaultVisible: false, align: "right" },
  { id: "actions", label: "Actions", defaultVisible: true, align: "right" },
];

function getDateRangeForPreset(
  preset: string,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today": {
      const todayStr = formatYMD(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const str = formatYMD(yesterday);
      return { startDate: str, endDate: str };
    }
    case "this_week": {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return { startDate: formatYMD(startOfWeek), endDate: formatYMD(now) };
    }
    case "last_week": {
      const startOfLastWeek = new Date(now);
      const day = startOfLastWeek.getDay();
      const diff = startOfLastWeek.getDate() - day - 6;
      startOfLastWeek.setDate(diff);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return { startDate: formatYMD(startOfLastWeek), endDate: formatYMD(endOfLastWeek) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }
    case "last_30_days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: formatYMD(start), endDate: formatYMD(now) };
    }
    case "this_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const end = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }
    case "last_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      const end = new Date(now.getFullYear(), (currentQuarter - 1) * 3 + 3, 0);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }
    case "last_3_months": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return { startDate: formatYMD(start), endDate: formatYMD(now) };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }
    case "last_year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }
    case "last_12_months": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 12);
      return { startDate: formatYMD(start), endDate: formatYMD(now) };
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

  const saveConfig = (order: ColumnId[], visible: Set<ColumnId>) => {
    try {
      localStorage.setItem(
        "vinbook_invoices_columns_config_v2",
        JSON.stringify({
          order,
          visible: Array.from(visible),
        })
      );
    } catch {}
  };

  const toggleColumn = (id: ColumnId) => {
    const next = new Set(visibleColumns);
    if (next.has(id)) {
      if (next.size <= 1) return; // keep at least 1 column
      next.delete(id);
    } else {
      next.add(id);
    }
    setVisibleColumns(next);
    saveConfig(columnOrder, next);
  };

  // Active displayed columns in current order
  const displayedColumns = columnOrder
    .filter((id) => visibleColumns.has(id))
    .map((id) => ALL_COLUMNS.find((c) => c.id === id)!);

  const handleColumnDrop = (targetIndex: number) => {
    if (draggedColIndex === null || draggedColIndex === targetIndex) {
      setDraggedColIndex(null);
      setDragOverColIndex(null);
      return;
    }
    const fromColId = displayedColumns[draggedColIndex]?.id;
    const toColId = displayedColumns[targetIndex]?.id;

    if (!fromColId || !toColId) {
      setDraggedColIndex(null);
      setDragOverColIndex(null);
      return;
    }

    const newOrder = [...columnOrder];
    const oldPos = newOrder.indexOf(fromColId);
    const newPos = newOrder.indexOf(toColId);

    if (oldPos !== -1 && newPos !== -1) {
      const [moved] = newOrder.splice(oldPos, 1);
      newOrder.splice(newPos, 0, moved);
      setColumnOrder(newOrder);
      saveConfig(newOrder, visibleColumns);
    }

    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  const handleResetColumns = () => {
    const defaultOrder = ALL_COLUMNS.map((c) => c.id);
    const defaultVis = new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id));
    setColumnOrder(defaultOrder);
    setVisibleColumns(defaultVis);
    try {
      localStorage.removeItem("vinbook_invoices_columns_config_v2");
    } catch {}
  };

  const isCustomConfig =
    JSON.stringify(columnOrder) !== JSON.stringify(ALL_COLUMNS.map((c) => c.id)) ||
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

      const dateRange = getDateRangeForPreset(dateFilter, customStartDate, customEndDate);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const response = await fetch(`/api/invoices?${params.toString()}`);
      
      if (!response.ok) {
        let errorMessage = "Unknown error";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Failed to fetch invoices"}`;
        }
        console.error("API error:", response.status, errorMessage);
        alert(`Failed to fetch invoices: ${errorMessage}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
      if (data.summary) {
        setSummary(data.summary);
      }
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      alert(`Error fetching invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, customerFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (page === 1) {
        fetchInvoices();
      } else {
        setPage(1);
      }
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingInvoice(null);
    fetchInvoices();
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300";
      case InvoiceStatus.SENT:
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
      case InvoiceStatus.OVERDUE:
        return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300";
      case InvoiceStatus.PARTIAL:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const renderCellContent = (columnId: ColumnId, invoice: Invoice) => {
    const paidAmount = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    switch (columnId) {
      case "date":
        return (
          <span className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            {new Date(invoice.date).toLocaleDateString()}
          </span>
        );

      case "number":
        return (
          <div>
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
          </div>
        );

      case "customer":
        return (
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{invoice.customer.name}</div>
            {invoice.salesRep && !visibleColumns.has("salesRep") && (
              <div className="text-xs text-muted-foreground">
                Rep: {invoice.salesRep}
              </div>
            )}
          </div>
        );

      case "sideMark":
        return invoice.sideMark ? (
          <div
            className="text-xs font-mono text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded px-2 py-1 max-w-[220px] truncate"
            title={invoice.sideMark}
          >
            {invoice.sideMark}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case "dueDate": {
        const isOverdue =
          invoice.status !== InvoiceStatus.PAID &&
          new Date(invoice.dueDate) < new Date();
        return isOverdue ? (
          <div className="flex flex-col">
            <span className="font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
              {new Date(invoice.dueDate).toLocaleDateString()}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Overdue
            </span>
          </div>
        ) : (
          <span className="text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
            {new Date(invoice.dueDate).toLocaleDateString()}
          </span>
        );
      }

      case "poNumber":
        return invoice.poNumber ? (
          <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
            {invoice.poNumber}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case "salesRep":
        return invoice.salesRep ? (
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {invoice.salesRep}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case "status":
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
              invoice.status
            )}`}
          >
            {invoice.status}
          </span>
        );

      case "amount":
        return (
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-50">
              ${Number(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {paidAmount > 0 && (
              <div className="text-xs text-muted-foreground">
                Paid: ${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        );

      case "balance": {
        const balance = Math.max(0, Number(invoice.total) - paidAmount);
        return (
          <div className="text-right">
            <span
              className={`font-semibold ${
                balance > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        );
      }

      case "actions":
        return (
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" asChild title="View Invoice">
              <Link href={`/dashboard/invoices/${invoice.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDownloadPackingList(invoice.id, e)}
              disabled={generatingPackingListId === invoice.id}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
              title="Generate / Download Packing List"
            >
              {generatingPackingListId === invoice.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              ) : (
                <Package className="h-4 w-4" />
              )}
            </Button>
            {invoice.status !== InvoiceStatus.PAID && (
              <Button
                variant="ghost"
                size="icon"
                title="Edit Invoice"
                onClick={() => {
                  setEditingInvoice(invoice);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your commercial invoices, delivery tracking, and payments
          </p>
        </div>
        <Button 
          type="button"
          onClick={() => {
            setEditingInvoice(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards according to Date Filter */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white p-5 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-zinc-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Total Invoiced Amount
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ${summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {summary.totalCount} total invoice{summary.totalCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-red-200/80 bg-gradient-to-br from-red-50/80 via-orange-50/40 to-white p-5 shadow-sm dark:border-red-900/50 dark:from-red-950/40 dark:via-orange-950/20 dark:to-zinc-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
            Overdue Invoices
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
            ${summary.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            {summary.overdueCount} overdue invoice{summary.overdueCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Edit Invoice" : "Create Invoice"}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice
                ? "Update invoice information"
                : "Create a new invoice for your customer"}
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingInvoice(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Filter Bar with Date Filter & Gear Column Customizer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice #, PO, side mark, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Select value={dateFilter} onValueChange={(val) => {
              setDateFilter(val);
              setPage(1);
            }}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="custom">Custom dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="last_week">Last week</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
                <SelectItem value="this_quarter">This quarter</SelectItem>
                <SelectItem value="last_quarter">Last quarter</SelectItem>
                <SelectItem value="last_3_months">Last 3 months</SelectItem>
                <SelectItem value="this_year">This year</SelectItem>
                <SelectItem value="last_year">Last year</SelectItem>
                <SelectItem value="last_12_months">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Inputs if Custom Dates selected */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[145px] bg-white dark:bg-zinc-900 text-xs"
                placeholder="Start date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[145px] bg-white dark:bg-zinc-900 text-xs"
                placeholder="End date"
              />
            </div>
          )}

          <Select value={statusFilter} onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}>
            <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={InvoiceStatus.SENT}>Sent</SelectItem>
              <SelectItem value={InvoiceStatus.PARTIAL}>Partial</SelectItem>
              <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
              <SelectItem value={InvoiceStatus.OVERDUE}>Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerFilter} onValueChange={(val) => {
            setCustomerFilter(val);
            setPage(1);
          }}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right side controls: Reset and Gear Icon */}
        <div className="flex items-center gap-2">
          {isCustomConfig && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetColumns}
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Reset column order and visibility to default"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Columns
            </Button>
          )}

          {/* Small Gear Icon Dropdown to Add / Remove Columns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white dark:bg-zinc-900 border text-muted-foreground hover:text-foreground hover:border-zinc-400 transition-colors shrink-0 shadow-sm"
                title="Add or remove columns"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Customize Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 bg-white dark:bg-zinc-950 shadow-xl border rounded-lg">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Add / Remove Columns
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[320px] overflow-y-auto space-y-0.5 py-1">
                {ALL_COLUMNS.map((col) => {
                  const isChecked = visibleColumns.has(col.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={isChecked}
                      onSelect={(e) => {
                        e.preventDefault();
                        toggleColumn(col.id);
                      }}
                      className="cursor-pointer text-sm font-medium py-1.5"
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </div>
              <DropdownMenuSeparator />
              <button
                type="button"
                onClick={handleResetColumns}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded p-1.5 transition-colors mt-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Default
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {displayedColumns.map((col, idx) => {
                const isDragging = draggedColIndex === idx;
                const isDragOver = dragOverColIndex === idx && draggedColIndex !== idx;

                return (
                  <TableHead
                    key={col.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", col.id);
                      setDraggedColIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverColIndex !== idx) setDragOverColIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverColIndex === idx) setDragOverColIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleColumnDrop(idx);
                    }}
                    onDragEnd={() => {
                      setDraggedColIndex(null);
                      setDragOverColIndex(null);
                    }}
                    className={`group select-none cursor-grab active:cursor-grabbing transition-all py-3 ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${
                      isDragging
                        ? "opacity-30 bg-zinc-100 dark:bg-zinc-800"
                        : isDragOver
                        ? "border-l-4 border-l-primary bg-primary/10"
                        : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                    }`}
                    title="Drag column header left or right to reorder"
                  >
                    <div
                      className={`inline-flex items-center gap-1 font-semibold ${
                        col.align === "right" ? "justify-end w-full" : "justify-start"
                      }`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      <span>{col.label}</span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={displayedColumns.length} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayedColumns.length} className="text-center py-8 text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                return (
                  <TableRow key={invoice.id}>
                    {displayedColumns.map((col) => (
                      <TableCell
                        key={col.id}
                        className={col.align === "right" ? "text-right" : "text-left"}
                      >
                        {renderCellContent(col.id, invoice)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}


