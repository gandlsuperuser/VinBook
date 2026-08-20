"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Eye,
  Copy,
  Package,
  Loader2,
  Calendar,
  Settings2,
  GripVertical,
  Check,
  RotateCcw,
  Sparkles,
  FileCheck,
} from "lucide-react";
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
import { EstimateForm } from "@/components/estimates/estimate-form";
import { EstimateStatus } from "@prisma/client";
import { downloadPackingListPDF } from "@/lib/packing-list-pdf";

interface Estimate {
  id: string;
  number: string;
  date: string;
  expiryDate: string | null;
  status: EstimateStatus;
  total: number;
  poNumber?: string | null;
  sideMark?: string | null;
  salesRep?: string | null;
  shipTo?: string | null;
  convertedToInvoice: boolean;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface EstimateSummary {
  totalCount: number;
  totalAmount: number;
  acceptedCount: number;
  acceptedAmount: number;
}

export type EstimateColumnId =
  | "date"
  | "number"
  | "customer"
  | "sideMark"
  | "status"
  | "amount"
  | "expiryDate"
  | "poNumber"
  | "salesRep"
  | "shipTo"
  | "actions";

interface ColumnDefinition {
  id: EstimateColumnId;
  label: string;
  defaultVisible: boolean;
  align?: "left" | "right";
}

const ALL_ESTIMATE_COLUMNS: ColumnDefinition[] = [
  { id: "date", label: "Date", defaultVisible: true, align: "left" },
  { id: "number", label: "Estimate #", defaultVisible: true, align: "left" },
  { id: "customer", label: "Customer", defaultVisible: true, align: "left" },
  { id: "sideMark", label: "Side Mark", defaultVisible: true, align: "left" },
  { id: "status", label: "Status", defaultVisible: true, align: "left" },
  { id: "amount", label: "Amount", defaultVisible: true, align: "right" },
  { id: "expiryDate", label: "Expiry Date", defaultVisible: false, align: "left" },
  { id: "poNumber", label: "PO Number", defaultVisible: false, align: "left" },
  { id: "salesRep", label: "Sales Rep", defaultVisible: false, align: "left" },
  { id: "shipTo", label: "Ship To", defaultVisible: false, align: "left" },
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

export default function EstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [summary, setSummary] = useState<EstimateSummary>({
    totalCount: 0,
    totalAmount: 0,
    acceptedCount: 0,
    acceptedAmount: 0,
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
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [generatingPackingListId, setGeneratingPackingListId] = useState<string | null>(null);

  // Dynamic movable and customizable columns state
  const [columnOrder, setColumnOrder] = useState<EstimateColumnId[]>(() =>
    ALL_ESTIMATE_COLUMNS.map((c) => c.id)
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<EstimateColumnId>>(
    () => new Set(ALL_ESTIMATE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
  );
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);

  // Load configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vinbook_estimates_columns_config_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.order) && Array.isArray(parsed.visible)) {
          const mergedOrder: EstimateColumnId[] = [];
          parsed.order.forEach((id: EstimateColumnId) => {
            if (ALL_ESTIMATE_COLUMNS.some((c) => c.id === id)) mergedOrder.push(id);
          });
          ALL_ESTIMATE_COLUMNS.forEach((c) => {
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
  const saveColumnConfig = (order: EstimateColumnId[], visible: Set<EstimateColumnId>) => {
    try {
      localStorage.setItem(
        "vinbook_estimates_columns_config_v2",
        JSON.stringify({
          order,
          visible: Array.from(visible),
        })
      );
    } catch (e) {
      console.error("Failed to save column settings:", e);
    }
  };

  const toggleColumnVisibility = (colId: EstimateColumnId) => {
    const updated = new Set(visibleColumns);
    if (updated.has(colId)) {
      if (updated.size <= 1) return; // Keep at least one column
      updated.delete(colId);
    } else {
      updated.add(colId);
    }
    setVisibleColumns(updated);
    saveColumnConfig(columnOrder, updated);
  };

  const resetColumnsToDefault = () => {
    const defaultOrder = ALL_ESTIMATE_COLUMNS.map((c) => c.id);
    const defaultVisible = new Set(
      ALL_ESTIMATE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
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
    .map((id) => ALL_ESTIMATE_COLUMNS.find((c) => c.id === id)!)
    .filter((col) => col && visibleColumns.has(col.id));

  const isCustomized =
    columnOrder.some((id, idx) => id !== ALL_ESTIMATE_COLUMNS[idx]?.id) ||
    visibleColumns.size !== ALL_ESTIMATE_COLUMNS.filter((c) => c.defaultVisible).length ||
    !ALL_ESTIMATE_COLUMNS.filter((c) => c.defaultVisible).every((c) => visibleColumns.has(c.id));

  const handleDownloadPackingList = async (estimateId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setGeneratingPackingListId(estimateId);
      const res = await fetch(`/api/estimates/${estimateId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch estimate details");
      }
      const data = await res.json();
      await downloadPackingListPDF(data.estimate || data);
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

  const fetchEstimates = async () => {
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

      const response = await fetch(`/api/estimates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEstimates(data.estimates || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (error) {
      console.error("Error fetching estimates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, [page, search, statusFilter, customerFilter, dateFilter, customStartDate, customEndDate]);

  const handleDuplicateEstimate = async (id: string) => {
    setDuplicatingId(id);
    try {
      const response = await fetch(`/api/estimates/${id}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        const newEstimate = await response.json();
        router.push(`/dashboard/estimates/${newEstimate.id}`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to duplicate estimate");
        setDuplicatingId(null);
      }
    } catch (error) {
      console.error("Error duplicating estimate:", error);
      alert("Failed to duplicate estimate");
      setDuplicatingId(null);
    }
  };

  const getStatusColor = (status: EstimateStatus) => {
    switch (status) {
      case EstimateStatus.ACCEPTED:
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case EstimateStatus.SENT:
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case EstimateStatus.DRAFT:
        return "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
      case EstimateStatus.EXPIRED:
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case EstimateStatus.REJECTED:
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimates & Quotes</h1>
          <p className="text-muted-foreground">
            Create, track, and convert proposals to invoices
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingEstimate(null)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEstimate ? "Edit Estimate" : "Create New Estimate"}
              </DialogTitle>
              <DialogDescription>
                {editingEstimate
                  ? "Update estimate details"
                  : "Fill in the details to create a new quote / estimate"}
              </DialogDescription>
            </DialogHeader>
            <EstimateForm
              estimate={editingEstimate || undefined}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingEstimate(null);
                fetchEstimates();
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingEstimate(null);
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
              Total Estimates
            </span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">
            ${summary.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.totalCount} {summary.totalCount === 1 ? "quote" : "quotes"} in selected date filter
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Accepted Proposals
            </span>
            <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            ${summary.acceptedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
            {summary.acceptedCount} accepted {summary.acceptedCount === 1 ? "estimate" : "estimates"}
          </p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Date Range Filter:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
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
                <span className="text-muted-foreground text-xs">to</span>
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
            Quick:
          </span>
          {[
            { key: "all", label: "All Time" },
            { key: "this_month", label: "This Month" },
            { key: "last_month", label: "Last Month" },
            { key: "this_quarter", label: "This Quarter" },
            { key: "this_year", label: "This Year" },
            { key: "last_30_days", label: "Last 30 Days" },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setDateFilter(preset.key)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
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
              placeholder="Search by estimate #, customer, side mark, PO #, sales rep..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Customer" />
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

        {/* Gear Icon: Customize & Reorder Columns */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 px-3 gap-2 ${
                  isCustomized
                    ? "border-primary/50 text-primary bg-primary/5"
                    : "text-muted-foreground"
                }`}
                title="Customize table columns & layout"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Columns</span>
                {isCustomized && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Visible Columns
                </DropdownMenuLabel>
                {isCustomized && (
                  <button
                    onClick={resetColumnsToDefault}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    title="Reset to default columns and order"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground px-2 pb-2 leading-relaxed">
                Check columns to show/hide. Drag table headers left or right to reorder.
              </p>
              <DropdownMenuSeparator />
              <div className="space-y-1 py-1">
                {ALL_ESTIMATE_COLUMNS.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={visibleColumns.has(col.id)}
                    onCheckedChange={() => toggleColumnVisibility(col.id)}
                    className="text-sm cursor-pointer"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Estimates Table with Drag-to-Reorder Headers */}
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
                    title={!isActions ? "Drag column to reorder" : undefined}
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
                        {col.label}
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
                    <span>Loading estimates...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : estimates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeVisibleColumns.length}
                  className="text-center py-10 text-muted-foreground"
                >
                  No estimates found for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              estimates.map((estimate) => (
                <TableRow key={estimate.id} className="hover:bg-muted/40 transition-colors">
                  {activeVisibleColumns.map((col) => {
                    switch (col.id) {
                      case "date":
                        return (
                          <TableCell key={col.id} className="font-medium whitespace-nowrap">
                            {new Date(estimate.date).toLocaleDateString()}
                          </TableCell>
                        );

                      case "number":
                        return (
                          <TableCell key={col.id} className="font-medium whitespace-nowrap">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium text-primary hover:underline cursor-pointer"
                              onClick={() => handleDuplicateEstimate(estimate.id)}
                              disabled={duplicatingId === estimate.id}
                              title="Duplicate Estimate"
                            >
                              {duplicatingId === estimate.id ? "Duplicating..." : estimate.number}
                            </Button>
                          </TableCell>
                        );

                      case "customer":
                        return (
                          <TableCell key={col.id} className="font-medium">
                            <div>{estimate.customer?.name || "-"}</div>
                            {estimate.customer?.email && (
                              <div className="text-xs text-muted-foreground">
                                {estimate.customer.email}
                              </div>
                            )}
                          </TableCell>
                        );

                      case "sideMark":
                        return (
                          <TableCell key={col.id} className="max-w-[200px]">
                            {estimate.sideMark ? (
                              <span
                                className="inline-block truncate max-w-full text-xs font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded"
                                title={estimate.sideMark}
                              >
                                {estimate.sideMark}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        );

                      case "status":
                        return (
                          <TableCell key={col.id}>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(
                                estimate.status
                              )}`}
                            >
                              {estimate.status}
                              {estimate.convertedToInvoice && " (Converted)"}
                            </span>
                          </TableCell>
                        );

                      case "amount":
                        return (
                          <TableCell key={col.id} className="text-right font-semibold whitespace-nowrap">
                            ${Number(estimate.total).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        );

                      case "expiryDate":
                        return (
                          <TableCell key={col.id} className="text-xs text-muted-foreground whitespace-nowrap">
                            {estimate.expiryDate
                              ? new Date(estimate.expiryDate).toLocaleDateString()
                              : "-"}
                          </TableCell>
                        );

                      case "poNumber":
                        return (
                          <TableCell key={col.id} className="text-xs font-mono">
                            {estimate.poNumber || "-"}
                          </TableCell>
                        );

                      case "salesRep":
                        return (
                          <TableCell key={col.id} className="text-xs">
                            {estimate.salesRep || "-"}
                          </TableCell>
                        );

                      case "shipTo":
                        return (
                          <TableCell key={col.id} className="text-xs max-w-[180px] truncate" title={estimate.shipTo || ""}>
                            {estimate.shipTo || "-"}
                          </TableCell>
                        );

                      case "actions":
                        return (
                          <TableCell key={col.id} className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="View Quote / Estimate Details"
                              >
                                <Link href={`/dashboard/estimates/${estimate.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDownloadPackingList(estimate.id, e)}
                                disabled={generatingPackingListId === estimate.id}
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                title="Generate / Download Packing List"
                              >
                                {generatingPackingListId === estimate.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                ) : (
                                  <Package className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicateEstimate(estimate.id)}
                                disabled={duplicatingId === estimate.id}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Duplicate Estimate"
                              >
                                <Copy className="h-4 w-4" />
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
