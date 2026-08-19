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

interface Customer {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  paymentTerms?: string | null;
  creditLimit?: number | null;
  prepaidCredit?: number | null;
  taxId?: string | null;
  notes?: string | null;
}

interface CustomerFormProps {
  customer?: Customer | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    billingAddress: {
      street: customer?.billingAddress?.street || "",
      city: customer?.billingAddress?.city || "",
      state: customer?.billingAddress?.state || "",
      zip: customer?.billingAddress?.zip || "",
      country: customer?.billingAddress?.country || "US",
    },
    shippingAddress: {
      street: customer?.shippingAddress?.street || "",
      city: customer?.shippingAddress?.city || "",
      state: customer?.shippingAddress?.state || "",
      zip: customer?.shippingAddress?.zip || "",
      country: customer?.shippingAddress?.country || "US",
    },
    paymentTerms: customer?.paymentTerms || "Net 30",
    creditLimit: customer?.creditLimit?.toString() || "",
    prepaidCredit: customer?.prepaidCredit?.toString() || "",
    taxId: customer?.taxId || "",
    notes: customer?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = customer?.id
        ? `/api/customers/${customer.id}`
        : "/api/customers";
      const method = customer?.id ? "PUT" : "POST";

      const payload = {
        ...formData,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
        prepaidCredit: formData.prepaidCredit && formData.prepaidCredit.trim() !== "" 
          ? parseFloat(formData.prepaidCredit) 
          : 0,
        billingAddress: Object.values(formData.billingAddress).some(v => v)
          ? formData.billingAddress
          : undefined,
        shippingAddress: Object.values(formData.shippingAddress).some(v => v)
          ? formData.shippingAddress
          : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to save customer";
        const details = data.details ? `: ${data.details}` : "";
        setError(`${errorMsg}${details}`);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving customer:", error);
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
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID</Label>
            <Input
              id="taxId"
              value={formData.taxId}
              onChange={(e) =>
                setFormData({ ...formData, taxId: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Billing Address</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billingStreet">Street</Label>
            <Input
              id="billingStreet"
              value={formData.billingAddress.street}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    street: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingCity">City</Label>
            <Input
              id="billingCity"
              value={formData.billingAddress.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    city: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingState">State</Label>
            <Input
              id="billingState"
              value={formData.billingAddress.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    state: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingZip">ZIP Code</Label>
            <Input
              id="billingZip"
              value={formData.billingAddress.zip}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    zip: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingCountry">Country</Label>
            <Input
              id="billingCountry"
              value={formData.billingAddress.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    country: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shipping Address</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="shippingStreet">Street</Label>
            <Input
              id="shippingStreet"
              value={formData.shippingAddress.street}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    street: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingCity">City</Label>
            <Input
              id="shippingCity"
              value={formData.shippingAddress.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    city: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingState">State</Label>
            <Input
              id="shippingState"
              value={formData.shippingAddress.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    state: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingZip">ZIP Code</Label>
            <Input
              id="shippingZip"
              value={formData.shippingAddress.zip}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    zip: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingCountry">Country</Label>
            <Input
              id="shippingCountry"
              value={formData.shippingAddress.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    country: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Payment Terms & Credit */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Terms</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Select
              value={formData.paymentTerms}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentTerms: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="Net 90">Net 90</SelectItem>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit</Label>
            <Input
              id="creditLimit"
              type="number"
              step="0.01"
              value={formData.creditLimit}
              onChange={(e) =>
                setFormData({ ...formData, creditLimit: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepaidCredit">Prepaid Credit</Label>
            <Input
              id="prepaidCredit"
              type="number"
              step="0.01"
              value={formData.prepaidCredit}
              onChange={(e) =>
                setFormData({ ...formData, prepaidCredit: e.target.value })
              }
              placeholder="Manual prepaid credit/adjustment"
            />
          </div>
        </div>
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
          rows={4}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : customer?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}



