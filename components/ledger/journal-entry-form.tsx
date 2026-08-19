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
import { Plus, Trash2, X } from "lucide-react";

interface JournalEntryItem {
  accountId: string;
  debit: number;
  credit: number;
}

interface JournalEntryFormProps {
  accounts: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalEntryForm({
  accounts,
  onSuccess,
  onCancel,
}: JournalEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    entries: [
      { accountId: "", debit: 0, credit: 0 },
      { accountId: "", debit: 0, credit: 0 },
    ] as JournalEntryItem[],
  });

  const calculateTotals = () => {
    const totalDebits = formData.entries.reduce(
      (sum, entry) => sum + (parseFloat(entry.debit.toString()) || 0),
      0
    );
    const totalCredits = formData.entries.reduce(
      (sum, entry) => sum + (parseFloat(entry.credit.toString()) || 0),
      0
    );
    return { totalDebits, totalCredits, difference: totalDebits - totalCredits };
  };

  const { totalDebits, totalCredits, difference } = calculateTotals();
  const isBalanced = Math.abs(difference) < 0.01;

  const handleEntryChange = (
    index: number,
    field: "accountId" | "debit" | "credit",
    value: any
  ) => {
    const newEntries = [...formData.entries];
    const entry = { ...newEntries[index] };

    if (field === "accountId") {
      entry.accountId = value;
    } else if (field === "debit") {
      const debitValue = parseFloat(value) || 0;
      entry.debit = debitValue;
      entry.credit = 0; // Clear credit when debit is entered
    } else if (field === "credit") {
      const creditValue = parseFloat(value) || 0;
      entry.credit = creditValue;
      entry.debit = 0; // Clear debit when credit is entered
    }

    newEntries[index] = entry;
    setFormData({ ...formData, entries: newEntries });
  };

  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [
        ...formData.entries,
        { accountId: "", debit: 0, credit: 0 },
      ],
    });
  };

  const removeEntry = (index: number) => {
    if (formData.entries.length > 2) {
      const newEntries = formData.entries.filter((_, i) => i !== index);
      setFormData({ ...formData, entries: newEntries });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!formData.description) {
      setError("Description is required");
      setLoading(false);
      return;
    }

    if (!isBalanced) {
      setError("Total debits must equal total credits");
      setLoading(false);
      return;
    }

    const validEntries = formData.entries.filter((e) => e.accountId);
    if (validEntries.length < 2) {
      setError("At least two entries are required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/ledger/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          description: formData.description,
          entries: validEntries.map((e) => ({
            accountId: e.accountId,
            debit: parseFloat(e.debit.toString()) || 0,
            credit: parseFloat(e.credit.toString()) || 0,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create journal entry");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating journal entry:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Journal Entries</h3>
          <Button type="button" variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
        <div className="border rounded-lg">
          <div className="grid grid-cols-12 gap-2 p-2 bg-muted font-medium text-sm border-b">
            <div className="col-span-4">Account</div>
            <div className="col-span-3">Debit</div>
            <div className="col-span-3">Credit</div>
            <div className="col-span-2"></div>
          </div>
          {formData.entries.map((entry, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 p-2 border-b">
              <div className="col-span-4">
                <Select
                  value={entry.accountId}
                  onValueChange={(value) =>
                    handleEntryChange(index, "accountId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entry.debit || ""}
                  onChange={(e) =>
                    handleEntryChange(index, "debit", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entry.credit || ""}
                  onChange={(e) =>
                    handleEntryChange(index, "credit", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEntry(index)}
                  disabled={formData.entries.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-md space-y-2 border-t pt-4">
            <div className="flex justify-between font-medium">
              <span>Total Debits:</span>
              <span className={isBalanced ? "text-green-600" : "text-red-600"}>
                ${totalDebits.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Credits:</span>
              <span className={isBalanced ? "text-green-600" : "text-red-600"}>
                ${totalCredits.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Difference:</span>
              <span className={isBalanced ? "text-green-600" : "text-red-600"}>
                ${Math.abs(difference).toFixed(2)}
              </span>
            </div>
            {!isBalanced && (
              <p className="text-sm text-red-600">
                Debits and credits must be equal
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !isBalanced}>
          {loading ? "Creating..." : "Create Journal Entry"}
        </Button>
      </div>
    </form>
  );
}



