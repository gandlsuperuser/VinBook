"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Copy } from "lucide-react";
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
import { EstimateForm } from "@/components/estimates/estimate-form";
import { EstimateStatus } from "@prisma/client";

interface Estimate {
  id: string;
  number: string;
  date: string;
  expiryDate: string | null;
  status: EstimateStatus;
  total: number;
  convertedToInvoice: boolean;
  customer: {
    id: string;
    name: string;
  };
}

export default function EstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

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

      const response = await fetch(`/api/estimates?${params.toString()}`);
      const data = await response.json();
      setEstimates(data.estimates || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching estimates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, [page, statusFilter, customerFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (page === 1) {
        fetchEstimates();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingEstimate(null);
    fetchEstimates();
  };

  const getStatusColor = (status: EstimateStatus) => {
    switch (status) {
      case EstimateStatus.ACCEPTED:
        return "bg-green-100 text-green-800";
      case EstimateStatus.SENT:
        return "bg-blue-100 text-blue-800";
      case EstimateStatus.REJECTED:
        return "bg-red-100 text-red-800";
      case EstimateStatus.EXPIRED:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimates</h1>
          <p className="text-muted-foreground">
            Manage your estimates and quotes
          </p>
        </div>
        <Button onClick={() => {
          setEditingEstimate(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Estimate
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEstimate ? "Edit Estimate" : "Create Estimate"}
              </DialogTitle>
              <DialogDescription>
                {editingEstimate
                  ? "Update estimate information"
                  : "Create a new estimate for your customer"}
              </DialogDescription>
            </DialogHeader>
            <EstimateForm
              estimate={editingEstimate}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingEstimate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search estimates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={EstimateStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={EstimateStatus.SENT}>Sent</SelectItem>
            <SelectItem value={EstimateStatus.ACCEPTED}>Accepted</SelectItem>
            <SelectItem value={EstimateStatus.REJECTED}>Rejected</SelectItem>
            <SelectItem value={EstimateStatus.EXPIRED}>Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[180px]">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estimate #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : estimates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No estimates found
                </TableCell>
              </TableRow>
            ) : (
              estimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell className="font-medium">
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
                  <TableCell>{estimate.customer.name}</TableCell>
                  <TableCell>
                    {new Date(estimate.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {estimate.expiryDate
                      ? new Date(estimate.expiryDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(
                        estimate.status
                      )}`}
                    >
                      {estimate.status}
                      {estimate.convertedToInvoice && " (Converted)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(estimate.total).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild title="View Estimate">
                      <Link href={`/dashboard/estimates/${estimate.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateEstimate(estimate.id)}
                      title="Duplicate Estimate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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


