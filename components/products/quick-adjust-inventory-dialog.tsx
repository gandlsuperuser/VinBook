"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Package, Plus, Minus, Equal, Loader2, ArrowRight } from "lucide-react";

interface QuickAdjustInventoryDialogProps {
  product: {
    id: string;
    name: string;
    sku?: string | null;
    inventory?: number | null;
    unit?: string | null;
    cost?: number;
    location?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAdjustInventoryDialog({
  product,
  isOpen,
  onClose,
  onSuccess,
}: QuickAdjustInventoryDialogProps) {
  const [mode, setMode] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [qty, setQty] = useState<string>("10");
  const [reason, setReason] = useState<string>("RESTOCK");
  const [reference, setReference] = useState<string>("");
  const [performer, setPerformer] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && product) {
      setMode("ADD");
      setQty("10");
      setReason("RESTOCK");
      setReference("");
      setPerformer("");
      setNotes("");
      setUnitCost(product.cost ? product.cost.toString() : "");
      setError("");
    }
  }, [isOpen, product]);

  if (!product) return null;

  const currentStock = product.inventory ?? 0;
  const unit = product.unit || "boxes";
  const numQty = parseInt(qty) || 0;

  let newStock = currentStock;
  if (mode === "ADD") newStock = currentStock + numQty;
  else if (mode === "REMOVE") newStock = Math.max(0, currentStock - numQty);
  else if (mode === "SET") newStock = Math.max(0, numQty);

  const delta = newStock - currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delta === 0) {
      onClose();
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${product.id}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: delta > 0 ? "ADD" : "REMOVE",
          type: reason,
          quantity: Math.abs(delta),
          reference: reference || (mode === "ADD" ? "Stock Addition" : mode === "REMOVE" ? "Stock Reduction" : "Inventory Adjustment"),
          notes: notes || undefined,
          performedBy: performer || undefined,
          unitCost: unitCost ? parseFloat(unitCost) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to adjust inventory");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to adjust inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-zinc-950">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Adjust Inventory</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {product.name} {product.sku && `(SKU: ${product.sku})`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="p-2.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded">
              {error}
            </div>
          )}

          {/* Mode Selector: Add (+), Reduce (-), Set Exact (=) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("ADD");
                  setReason("RESTOCK");
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  mode === "ADD"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-muted-foreground"
                }`}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("REMOVE");
                  setReason("ADJUSTMENT");
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  mode === "REMOVE"
                    ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-muted-foreground"
                }`}
              >
                <Minus className="h-3.5 w-3.5 text-red-600" />
                Reduce Stock
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("SET");
                  setReason("ADJUSTMENT");
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  mode === "SET"
                    ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-muted-foreground"
                }`}
              >
                <Equal className="h-3.5 w-3.5 text-blue-600" />
                Set Exact
              </button>
            </div>
          </div>

          {/* Quantity Input with Live Stock Preview */}
          <div className="space-y-1.5">
            <Label htmlFor="adjustQty" className="text-xs font-semibold">
              {mode === "SET" ? "New Total Count *" : "Quantity *"}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="adjustQty"
                type="number"
                min="1"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="text-base font-bold"
                placeholder="10"
                autoFocus
              />
              <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">
                {unit}
              </span>
            </div>
          </div>

          {/* Live Before & After Preview Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Current Stock
              </div>
              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                {currentStock} {unit}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                New Stock
              </div>
              <div className="text-lg font-bold flex items-center justify-end gap-1.5">
                <span
                  className={
                    delta > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : delta < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-900 dark:text-zinc-100"
                  }
                >
                  {newStock} {unit}
                </span>
                {delta !== 0 && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    ({delta > 0 ? `+${delta}` : delta})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reason & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTOCK">Restock Shipment</SelectItem>
                  <SelectItem value="ADDED">Stock Received</SelectItem>
                  <SelectItem value="ADJUSTMENT">Count Adjustment</SelectItem>
                  <SelectItem value="PICKUP">Pickup / Order Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="adjustRef" className="text-xs">
                PO / Reference #
              </Label>
              <Input
                id="adjustRef"
                placeholder="e.g. PO-8921"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Performed By & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="adjustPerformer" className="text-xs">
                Handled By
              </Label>
              <Input
                id="adjustPerformer"
                placeholder="Staff / Driver name"
                value={performer}
                onChange={(e) => setPerformer(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="adjustNotes" className="text-xs">
                Notes
              </Label>
              <Input
                id="adjustNotes"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || numQty <= 0}
              className={
                mode === "REMOVE"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : mode === "REMOVE" ? (
                <Minus className="h-4 w-4 mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Update Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
