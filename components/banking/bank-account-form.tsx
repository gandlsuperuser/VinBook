"use client";

import { useState } from "react";
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
import { BankAccountType } from "@prisma/client";

interface BankAccount {
  id?: string;
  name?: string;
  type?: BankAccountType;
  accountNumber?: string | null;
  routingNumber?: string | null;
  bankName?: string | null;
  openingBalance?: number;
  openingDate?: string;
}

interface BankAccountFormProps {
  account?: BankAccount | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BankAccountForm({
  account,
  onSuccess,
  onCancel,
}: BankAccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: account?.name || "",
    type: account?.type || BankAccountType.CHECKING,
    accountNumber: account?.accountNumber || "",
    routingNumber: account?.routingNumber || "",
    bankName: account?.bankName || "",
    openingBalance: account?.openingBalance?.toString() || "0",
    openingDate:
      account?.openingDate || new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = account?.id
        ? `/api/bank-accounts/${account.id}`
        : "/api/bank-accounts";
      const method = account?.id ? "PUT" : "POST";

      const payload = {
        name: formData.name,
        type: formData.type,
        accountNumber: formData.accountNumber || undefined,
        routingNumber: formData.routingNumber || undefined,
        bankName: formData.bankName || undefined,
        ...(account?.id
          ? {}
          : {
              openingBalance: parseFloat(formData.openingBalance) || 0,
              openingDate: formData.openingDate,
            }),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save bank account");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving bank account:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Account Name *</Label>
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
          <Label htmlFor="type">Account Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({ ...formData, type: value as BankAccountType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BankAccountType.CHECKING}>Checking</SelectItem>
              <SelectItem value={BankAccountType.SAVINGS}>Savings</SelectItem>
              <SelectItem value={BankAccountType.CREDIT_CARD}>
                Credit Card
              </SelectItem>
              <SelectItem value={BankAccountType.OTHER}>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <Input
            id="bankName"
            value={formData.bankName}
            onChange={(e) =>
              setFormData({ ...formData, bankName: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) =>
              setFormData({ ...formData, accountNumber: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="routingNumber">Routing Number</Label>
          <Input
            id="routingNumber"
            value={formData.routingNumber}
            onChange={(e) =>
              setFormData({ ...formData, routingNumber: e.target.value })
            }
          />
        </div>
        {!account?.id && (
          <>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={(e) =>
                  setFormData({ ...formData, openingBalance: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingDate">Opening Date</Label>
              <Input
                id="openingDate"
                type="date"
                value={formData.openingDate}
                onChange={(e) =>
                  setFormData({ ...formData, openingDate: e.target.value })
                }
              />
            </div>
          </>
        )}
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : account?.id
            ? "Update Account"
            : "Create Account"}
        </Button>
      </div>
    </form>
  );
}



