"use client";

import { useState, useEffect } from "react";
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
import { AccountType } from "@prisma/client";

interface Account {
  id?: string;
  code?: string;
  name?: string;
  type?: AccountType;
  parentId?: string | null;
  isActive?: boolean;
}

interface AccountFormProps {
  account?: Account | null;
  accounts?: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function AccountForm({
  account,
  accounts = [],
  onSuccess,
  onCancel,
}: AccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    code: account?.code || "",
    name: account?.name || "",
    type: account?.type || AccountType.ASSET,
    parentId: account?.parentId || "",
    isActive: account?.isActive ?? true,
  });

  // Filter out current account and its children from parent options
  const availableParents = accounts.filter(
    (acc) => acc.id !== account?.id && acc.type === formData.type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = account?.id
        ? `/api/accounts/${account.id}`
        : "/api/accounts";
      const method = account?.id ? "PUT" : "POST";

      const payload = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        parentId: formData.parentId === "none" || !formData.parentId ? undefined : formData.parentId,
        ...(account?.id && { isActive: formData.isActive }),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save account");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving account:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Account Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value.toUpperCase() })
            }
            placeholder="e.g., 1000"
            required
          />
        </div>
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
              setFormData({ ...formData, type: value as AccountType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AccountType.ASSET}>Asset</SelectItem>
              <SelectItem value={AccountType.LIABILITY}>Liability</SelectItem>
              <SelectItem value={AccountType.EQUITY}>Equity</SelectItem>
              <SelectItem value={AccountType.REVENUE}>Revenue</SelectItem>
              <SelectItem value={AccountType.EXPENSE}>Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentId">Parent Account</Label>
          <Select
            value={formData.parentId || "none"}
            onValueChange={(value) =>
              setFormData({ ...formData, parentId: value === "none" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None (Top-level account)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Top-level account)</SelectItem>
              {availableParents.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {account?.id && (
          <div className="space-y-2">
            <Label htmlFor="isActive">Active</Label>
            <Select
              value={formData.isActive ? "true" : "false"}
              onValueChange={(value) =>
                setFormData({ ...formData, isActive: value === "true" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
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


