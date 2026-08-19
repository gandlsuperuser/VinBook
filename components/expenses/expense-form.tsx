"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseStatus, PaymentMethod } from "@prisma/client";

interface Expense {
  id?: string;
  vendorId?: string | null;
  date?: string;
  amount?: number;
  category?: string | null;
  description?: string | null;
  receipt?: string | null;
  paymentMethod?: PaymentMethod;
  status?: ExpenseStatus;
  notes?: string | null;
}

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    vendorId: expense?.vendorId || "",
    date: expense?.date || new Date().toISOString().split("T")[0],
    amount: expense?.amount?.toString() || "",
    category: expense?.category || "",
    description: expense?.description || "",
    receipt: expense?.receipt || "",
    paymentMethod: expense?.paymentMethod || PaymentMethod.CASH,
    status: expense?.status || ExpenseStatus.PENDING,
    notes: expense?.notes || "",
  });

  useEffect(() => {
    fetchVendors();
    fetchCategories();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors?limit=1000");
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/expenses?limit=1");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const url = expense?.id
        ? `/api/expenses/${expense.id}`
        : "/api/expenses";
      const method = expense?.id ? "PUT" : "POST";

      const payload = {
        vendorId: formData.vendorId === "none" || !formData.vendorId ? undefined : formData.vendorId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        category: formData.category === "none" || !formData.category ? undefined : formData.category,
        description: formData.description || undefined,
        receipt: formData.receipt || undefined,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save expense");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving expense:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendorId">Vendor</Label>
            <Select
              value={formData.vendorId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, vendorId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex gap-2">
              <Select
                value={formData.category || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select or enter category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="New category"
                value={
                  formData.category && !categories.includes(formData.category)
                    ? formData.category
                    : ""
                }
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  paymentMethod: value as PaymentMethod,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                <SelectItem value={PaymentMethod.CREDIT_CARD}>
                  Credit Card
                </SelectItem>
                <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                  Bank Transfer
                </SelectItem>
                <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as ExpenseStatus,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ExpenseStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ExpenseStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={ExpenseStatus.REIMBURSED}>
                  Reimbursed
                </SelectItem>
                <SelectItem value={ExpenseStatus.PAID}>Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div className="space-y-2">
        <Label htmlFor="receipt">Receipt URL</Label>
        <Input
          id="receipt"
          type="url"
          placeholder="https://..."
          value={formData.receipt}
          onChange={(e) =>
            setFormData({ ...formData, receipt: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Upload receipt using Uploadthing and paste the URL here (Uploadthing integration coming soon)
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          rows={3}
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : expense?.id
            ? "Update Expense"
            : "Create Expense"}
        </Button>
      </div>
    </form>
  );
}



