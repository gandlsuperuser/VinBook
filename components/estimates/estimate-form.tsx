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
import { X, Plus, Trash2 } from "lucide-react";
import { EstimateStatus } from "@prisma/client";

interface EstimateItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax?: number;
}

interface Estimate {
  id?: string;
  customerId?: string;
  date?: string;
  expiryDate?: string | null;
  status?: EstimateStatus;
  items?: EstimateItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  notes?: string | null;
  terms?: string | null;
}

interface EstimateFormProps {
  estimate?: Estimate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EstimateForm({
  estimate,
  onSuccess,
  onCancel,
}: EstimateFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: estimate?.customerId || "",
    date: estimate?.date || new Date().toISOString().split("T")[0],
    expiryDate:
      estimate?.expiryDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    status: estimate?.status || EstimateStatus.DRAFT,
    items: estimate?.items || [
      { description: "", quantity: 1, rate: 0, amount: 0 },
    ],
    taxRate: 0,
    discount: estimate?.discount || 0,
    notes: estimate?.notes || "",
    terms: estimate?.terms || "",
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=1000");
      const data = await response.json();
      setProducts(data.products?.filter((p: any) => p.isActive) || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const calculateItemAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const tax = subtotal * (formData.taxRate / 100);
    const discountAmount = formData.discount;
    const total = subtotal + tax - discountAmount;

    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (field === "productId") {
      if (value === "custom") {
        item.productId = undefined;
      } else {
        const product = products.find((p) => p.id === value);
        if (product) {
          item.productId = value;
          item.description = product.name;
          item.rate = product.price;
          item.quantity = 1;
          item.amount = calculateItemAmount(1, product.price);
        }
      }
    } else if (field === "quantity") {
      item.quantity = parseFloat(value) || 0;
      item.amount = calculateItemAmount(item.quantity, item.rate);
    } else if (field === "rate") {
      item.rate = parseFloat(value) || 0;
      item.amount = calculateItemAmount(item.quantity, item.rate);
    } else if (field === "description") {
      item.description = value;
    } else if (field === "tax") {
      item.tax = value ? parseFloat(value) : undefined;
    } else if (field === "id") {
      item.id = value;
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { description: "", quantity: 1, rate: 0, amount: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.customerId) {
      setError("Please select a customer");
      setLoading(false);
      return;
    }

    if (
      formData.items.length === 0 ||
      formData.items.some((item) => !item.description)
    ) {
      setError("Please add at least one item with description");
      setLoading(false);
      return;
    }

    try {
      const url = estimate?.id
        ? `/api/estimates/${estimate.id}`
        : "/api/estimates";
      const method = estimate?.id ? "PUT" : "POST";

      const payload = {
        customerId: formData.customerId,
        date: formData.date,
        expiryDate: formData.expiryDate,
        status: formData.status,
        items: formData.items.map((item) => ({
          ...item,
          productId: item.productId === "custom" ? undefined : item.productId || undefined,
        })),
        subtotal,
        tax,
        discount: formData.discount,
        total,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save estimate");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving estimate:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer *</Label>
          <Select
            value={formData.customerId}
            onValueChange={(value) =>
              setFormData({ ...formData, customerId: value })
            }
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as EstimateStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EstimateStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={EstimateStatus.SENT}>Sent</SelectItem>
              <SelectItem value={EstimateStatus.ACCEPTED}>Accepted</SelectItem>
              <SelectItem value={EstimateStatus.REJECTED}>Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Estimate Date *</Label>
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
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) =>
              setFormData({ ...formData, expiryDate: e.target.value })
            }
          />
        </div>
      </div>

      {/* Line Items - Same as invoice form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
        <div className="border rounded-lg">
          <div className="grid grid-cols-12 gap-2 p-2 bg-muted font-medium text-sm">
            <div className="col-span-4">Product/Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2"></div>
          </div>
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 p-2 border-t">
              <div className="col-span-4">
                <Select
                  value={item.productId || "custom"}
                  onValueChange={(value) =>
                    handleItemChange(index, "productId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(index, "description", e.target.value)
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.rate}
                  onChange={(e) =>
                    handleItemChange(index, "rate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="col-span-2 flex items-center">
                ${item.amount.toFixed(2)}
              </div>
              <div className="col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="taxRate">Tax Rate (%):</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-20"
                value={formData.taxRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxRate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="discount">Discount:</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                className="w-24"
                value={formData.discount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <span>-${formData.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
      <div className="grid gap-4 md:grid-cols-2">
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
        <div className="space-y-2">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            value={formData.terms}
            onChange={(e) =>
              setFormData({ ...formData, terms: e.target.value })
            }
            rows={3}
          />
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : estimate?.id
            ? "Update Estimate"
            : "Create Estimate"}
        </Button>
      </div>
    </form>
  );
}


