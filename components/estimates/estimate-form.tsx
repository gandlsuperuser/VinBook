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
import { useLanguage } from "@/components/providers/language-context";
import { LineItemAutocomplete } from "@/components/ui/line-item-autocomplete";

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
  poNumber?: string | null;
  sideMark?: string | null;
  salesRep?: string | null;
  shipTo?: string | null;
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
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: estimate?.customerId || "",
    date: estimate?.date || new Date().toISOString().split("T")[0],
    expiryDate: estimate?.expiryDate || "",
    status: estimate?.status || EstimateStatus.DRAFT,
    poNumber: estimate?.poNumber || "",
    sideMark: estimate?.sideMark || "",
    salesRep: estimate?.salesRep || "",
    shipTo: estimate?.shipTo || "",
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

  const handleSelectProduct = (index: number, product: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    const price = Number(product.price) || 0;
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

    item.productId = product.id;
    item.description = product.name;
    item.rate = price;
    item.quantity = qty;
    item.amount = calculateItemAmount(qty, price);

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleClearProduct = (index: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], productId: undefined };
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
      setError(t("invoices.selectCustomer"));
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
        expiryDate: formData.expiryDate || undefined,
        status: formData.status,
        poNumber: formData.poNumber || undefined,
        sideMark: formData.sideMark || undefined,
        salesRep: formData.salesRep || undefined,
        shipTo: formData.shipTo || undefined,
        items: formData.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
          productId: item.productId === "custom" ? undefined : item.productId || undefined,
          tax: item.tax ? Number(item.tax) : undefined,
        })),
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        discount: Number(formData.discount) || 0,
        total: Number(total) || 0,
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
        let errMsg = data.error || "Failed to save estimate";
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          const detailStrings = data.details.map((d: any) => {
            const fieldPath = Array.isArray(d.path) ? d.path.join(".") : "";
            return fieldPath ? `[${fieldPath}]: ${d.message}` : d.message;
          });
          errMsg = `${errMsg} (${detailStrings.join(", ")})`;
        }
        setError(errMsg);
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

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    let autoShipTo = formData.shipTo;

    if (!autoShipTo && customer?.shippingAddress) {
      const s = customer.shippingAddress;
      const lines = [s.street, [s.city, s.state, s.zip].filter(Boolean).join(", "), s.country].filter(Boolean);
      if (lines.length > 0) autoShipTo = lines.join("\n");
    }

    setFormData({
      ...formData,
      customerId,
      shipTo: autoShipTo,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">{t("common.customer")} *</Label>
          <Select
            value={formData.customerId}
            onValueChange={handleCustomerSelect}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder={t("invoices.selectCustomer")} />
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
          <Label htmlFor="status">{t("common.status")}</Label>
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
              <SelectItem value={EstimateStatus.DRAFT}>{t("estimates.statusDraft")}</SelectItem>
              <SelectItem value={EstimateStatus.SENT}>{t("estimates.statusSent")}</SelectItem>
              <SelectItem value={EstimateStatus.ACCEPTED}>{t("estimates.statusAccepted")}</SelectItem>
              <SelectItem value={EstimateStatus.REJECTED}>{t("estimates.statusRejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">{t("estimates.estimateDate")} *</Label>
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
          <Label htmlFor="expiryDate">{t("estimates.expiryDate")}</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) =>
              setFormData({ ...formData, expiryDate: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poNumber">{t("invoices.poNumber")}</Label>
          <Input
            id="poNumber"
            placeholder="e.g. PO-89412"
            value={formData.poNumber}
            onChange={(e) =>
              setFormData({ ...formData, poNumber: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salesRep">{t("invoices.salesRep")}</Label>
          <Input
            id="salesRep"
            placeholder="e.g. Li Mo"
            value={formData.salesRep}
            onChange={(e) =>
              setFormData({ ...formData, salesRep: e.target.value })
            }
          />
        </div>
      </div>

      {/* Ship To / Delivery Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="shipTo">{t("invoices.shipTo")}</Label>
          <span className="text-xs text-muted-foreground">
            Appears on Estimate, Converted Invoice & Packing List
          </span>
        </div>
        <Textarea
          id="shipTo"
          placeholder="Enter jobsite name, delivery street address, city, state, zip or receiving dock..."
          value={formData.shipTo}
          onChange={(e) =>
            setFormData({ ...formData, shipTo: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("invoices.itemDescription")}</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("common.addItem")}
          </Button>
        </div>
        <div className="border rounded-lg">
          <div className="grid grid-cols-12 gap-2 p-2 bg-muted font-medium text-sm">
            <div className="col-span-5">{t("invoices.itemSku")} / {t("common.description")}</div>
            <div className="col-span-2">{t("common.quantity")}</div>
            <div className="col-span-2">{t("common.rate")}</div>
            <div className="col-span-2">{t("common.amount")}</div>
            <div className="col-span-1"></div>
          </div>
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 p-2 border-t items-start">
              <div className="col-span-5">
                <LineItemAutocomplete
                  value={item.description}
                  productId={item.productId}
                  products={products}
                  placeholder="Search item by name, SKU or type custom..."
                  onChange={(desc) => handleItemChange(index, "description", desc)}
                  onSelectProduct={(product) => handleSelectProduct(index, product)}
                  onClearProduct={() => handleClearProduct(index)}
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
              <div className="col-span-2 flex items-center font-medium pt-2">
                ${Number(item.amount).toFixed(2)}
              </div>
              <div className="col-span-1 flex items-center justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
            <span>{t("common.subtotal")}:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="taxRate">{t("invoices.taxRate")}:</Label>
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
              <Label htmlFor="discount">{t("common.discount")}:</Label>
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
            <span>-${Number(formData.discount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>{t("common.total")}:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Side Mark (Internal Only) */}
      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <Label htmlFor="sideMark" className="font-semibold text-amber-900 dark:text-amber-300">
            {t("invoices.sideMarkLabel")}
          </Label>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {t("invoices.sideMarkHelp")}
          </span>
        </div>
        <Textarea
          id="sideMark"
          placeholder={t("invoices.sideMarkPlaceholder")}
          value={formData.sideMark}
          onChange={(e) =>
            setFormData({ ...formData, sideMark: e.target.value })
          }
          rows={3}
          className="bg-white dark:bg-zinc-900"
        />
      </div>

      {/* Notes and Terms */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="notes">{t("common.notes")}</Label>
          <Textarea
            id="notes"
            placeholder={t("invoices.deliveryInstructions")}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="terms">{t("common.terms")}</Label>
          <Textarea
            id="terms"
            placeholder={t("invoices.termsAndConditions")}
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
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={loading} className="cursor-pointer">
          {loading
            ? t("common.saving")
            : estimate?.id
            ? t("estimates.editEstimate")
            : t("estimates.newEstimate")}
        </Button>
      </div>
    </form>
  );
}


