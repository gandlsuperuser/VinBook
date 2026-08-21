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
import { X, Plus, Trash2, Box, Sparkles } from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import { useLanguage } from "@/components/providers/language-context";
import { LineItemAutocomplete } from "@/components/ui/line-item-autocomplete";
import {
  extractSqftPerBox,
  calculateFlooringBoxes,
  calculateSqftFromBoxes,
  calculateLineItemAmount,
} from "@/lib/flooring-calculator";

interface InvoiceItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax?: number;
  sqftPerBox?: number;
  boxes?: number;
}

interface Invoice {
  id?: string;
  customerId?: string;
  date?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  items?: InvoiceItem[];
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
  taxRate?: number;
}

interface InvoiceFormProps {
  invoice?: Invoice | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: invoice?.customerId || "",
    date: invoice?.date || new Date().toISOString().split("T")[0],
    dueDate: invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: invoice?.status || InvoiceStatus.DRAFT,
    poNumber: invoice?.poNumber || "",
    sideMark: invoice?.sideMark || "",
    salesRep: invoice?.salesRep || "",
    shipTo: invoice?.shipTo || "",
    items: invoice?.items || [
      { description: "", quantity: 1, rate: 0, amount: 0 },
    ],
    taxRate: invoice?.taxRate ?? (invoice?.subtotal && invoice?.tax ? (invoice.tax / invoice.subtotal) * 100 : 0),
    discount: invoice?.discount || 0,
    notes: invoice?.notes || "",
    terms: invoice?.terms || "",
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  // Update form data when invoice prop changes (for editing)
  useEffect(() => {
    if (invoice) {
      const formatDate = (date: string | Date | undefined): string => {
        if (!date) return new Date().toISOString().split("T")[0];
        if (typeof date === 'string') {
          return new Date(date).toISOString().split("T")[0];
        }
        return date.toISOString().split("T")[0];
      };

      setFormData({
        customerId: invoice.customerId || "",
        date: formatDate(invoice.date),
        dueDate: formatDate(invoice.dueDate),
        status: invoice.status || InvoiceStatus.DRAFT,
        poNumber: invoice.poNumber || "",
        sideMark: invoice.sideMark || "",
        salesRep: invoice.salesRep || "",
        shipTo: invoice.shipTo || "",
        items: invoice.items?.map(item => ({
          id: item.id,
          productId: item.productId,
          description: item.description || "",
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
          tax: item.tax ? Number(item.tax) : undefined,
        })) || [{ description: "", quantity: 1, rate: 0, amount: 0 }],
        taxRate: invoice.taxRate ?? (invoice.subtotal && invoice.tax ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100 : 0),
        discount: Number(invoice.discount) || 0,
        notes: invoice.notes || "",
        terms: invoice.terms || "",
      });
    }
  }, [invoice]);

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

  const calculateItemAmount = (quantityBoxes: number, rate: number, sqftPerBox?: number) => {
    return calculateLineItemAmount(quantityBoxes, rate, sqftPerBox).amount;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const tax = Number(subtotal) * (Number(formData.taxRate || 0) / 100);
    const discountAmount = Number(formData.discount || 0);
    const total = Number(subtotal) + Number(tax) - Number(discountAmount);

    return { subtotal: Number(subtotal), tax: Number(tax), total: Number(total) };
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
          const sqft = extractSqftPerBox(product);
          item.productId = value;
          item.description = product.name;
          item.rate = product.price;
          item.quantity = item.quantity > 0 ? item.quantity : 1;
          item.sqftPerBox = sqft || undefined;
          item.boxes = item.quantity;
          item.amount = calculateItemAmount(item.quantity, product.price, sqft || undefined);
        }
      }
    } else if (field === "quantity") {
      item.quantity = parseFloat(value) || 0;
      item.boxes = item.quantity;
      item.amount = calculateItemAmount(item.quantity, item.rate, item.sqftPerBox);
    } else if (field === "rate") {
      item.rate = parseFloat(value) || 0;
      item.amount = calculateItemAmount(item.quantity, item.rate, item.sqftPerBox);
    } else if (field === "description") {
      item.description = value;
      const parsedSqft = extractSqftPerBox(value);
      if (parsedSqft) {
        item.sqftPerBox = parsedSqft;
      }
      item.amount = calculateItemAmount(item.quantity, item.rate, item.sqftPerBox);
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
    const sqft = extractSqftPerBox(product);

    item.productId = product.id;
    item.description = product.name;
    item.rate = price;
    item.quantity = qty;
    item.sqftPerBox = sqft || undefined;
    item.boxes = qty;
    item.amount = calculateItemAmount(qty, price, sqft || undefined);

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleConvertSqftToBoxes = (index: number, targetSqft: number, sqftPerBox: number) => {
    const boxes = Math.ceil(targetSqft / sqftPerBox);
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    item.quantity = boxes;
    item.boxes = boxes;
    item.sqftPerBox = sqftPerBox;
    item.amount = calculateItemAmount(boxes, item.rate, sqftPerBox);
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

    if (formData.items.length === 0 || formData.items.some((item) => !item.description)) {
      setError("Please add at least one item with description");
      setLoading(false);
      return;
    }

    try {
      const url = invoice?.id
        ? `/api/invoices/${invoice.id}`
        : "/api/invoices";
      const method = invoice?.id ? "PUT" : "POST";

      const payload = {
        customerId: formData.customerId,
        date: formData.date,
        dueDate: formData.dueDate,
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
        setError(data.error || "Failed to save invoice");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    let autoShipTo = formData.shipTo;

    if (customer && !autoShipTo) {
      const addr = customer.shippingAddress || customer.billingAddress;
      if (addr) {
        const parts = [
          customer.name,
          addr.street,
          [addr.city, addr.state, addr.zip].filter(Boolean).join(", "),
          addr.country,
        ].filter(Boolean);
        if (parts.length > 0) {
          autoShipTo = parts.join("\n");
        }
      }
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
              setFormData({ ...formData, status: value as InvoiceStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={InvoiceStatus.DRAFT}>{t("invoices.statusDraft")}</SelectItem>
              <SelectItem value={InvoiceStatus.SENT}>{t("invoices.statusSent")}</SelectItem>
              <SelectItem value={InvoiceStatus.PAID}>{t("invoices.statusPaid")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">{t("invoices.invoiceDate")} *</Label>
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
          <Label htmlFor="dueDate">{t("invoices.dueDate")} *</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
            required
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

      {/* Ship To / Jobsite Delivery Address */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="shipTo">{t("invoices.shipTo")}</Label>
          <span className="text-xs text-muted-foreground">
            Appears on Invoice Detail, Printed Invoice & Packing List
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
                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Boxes"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground pointer-events-none font-medium">
                    {item.sqftPerBox ? "bx" : "qty"}
                  </span>
                </div>
                {(() => {
                  const sqftPerBox = item.sqftPerBox || extractSqftPerBox(item.description);
                  if (!sqftPerBox || Number(item.quantity) <= 0) return null;
                  const totalSqft = parseFloat((Number(item.quantity) * sqftPerBox).toFixed(2));
                  const pricePerBox = parseFloat((sqftPerBox * Number(item.rate || 0)).toFixed(2));

                  return (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200/60 flex items-center justify-between">
                        <span>📦 = {totalSqft.toLocaleString()} sqft</span>
                        <span className="text-[10px] text-muted-foreground">({sqftPerBox} sf/bx)</span>
                      </div>
                      {Number(item.rate) > 0 && (
                        <div className="text-[10px] text-muted-foreground px-0.5 flex justify-between">
                          <span>${Number(item.rate).toFixed(2)}/sf</span>
                          <span className="font-medium text-foreground/80">${pricePerBox.toFixed(2)}/bx</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.rate}
                    onChange={(e) =>
                      handleItemChange(index, "rate", e.target.value)
                    }
                    className={item.sqftPerBox ? "pr-10" : ""}
                    required
                  />
                  {item.sqftPerBox ? (
                    <span className="absolute right-2 top-2.5 text-[11px] text-muted-foreground pointer-events-none">
                      /sqft
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="col-span-2 flex items-center font-medium pt-2">
                {`$${Number(item.amount).toFixed(2)}`}
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
            <span>{`$${Number(subtotal || 0).toFixed(2)}`}</span>
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
            <span>{`$${Number(tax || 0).toFixed(2)}`}</span>
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
            <span>{`-$${Number(formData.discount || 0).toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>{t("common.total")}:</span>
            <span>{`$${Number(total || 0).toFixed(2)}`}</span>
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
            : invoice?.id
            ? t("invoices.editInvoice")
            : t("invoices.newInvoice")}
        </Button>
      </div>
    </form>
  );
}


