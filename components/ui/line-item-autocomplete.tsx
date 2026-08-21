"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Package, Search, Check, Sparkles, Tag, Layers, X, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractSqftPerBox } from "@/lib/flooring-calculator";

export interface ProductSuggestion {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number | string;
  cost?: number | string;
  category?: string | null;
  inventory?: number | null;
  unit?: string | null;
  sqftPerBox?: number | string | null;
  boxesPerPallet?: number | null;
  isActive?: boolean;
}

interface LineItemAutocompleteProps {
  value: string;
  productId?: string;
  products: ProductSuggestion[];
  placeholder?: string;
  onChange: (description: string) => void;
  onSelectProduct: (product: ProductSuggestion) => void;
  onClearProduct?: () => void;
  required?: boolean;
  className?: string;
  id?: string;
}

export function LineItemAutocomplete({
  value,
  productId,
  products = [],
  placeholder = "Type item name, SKU, or custom description...",
  onChange,
  onSelectProduct,
  onClearProduct,
  required = false,
  className,
  id,
}: LineItemAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal input value with prop
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Find currently linked product if any
  const linkedProduct = useMemo(() => {
    if (!productId || productId === "custom") return null;
    return products.find((p) => p.id === productId) || null;
  }, [productId, products]);

  // Filter and rank matching products based on search term
  const filteredProducts = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) {
      // If empty and open, return top 15 products
      return products.slice(0, 15);
    }

    const queryTokens = query.split(/\s+/).filter(Boolean);

    // Score and rank matches
    const scored = products
      .map((product) => {
        const name = (product.name || "").toLowerCase();
        const sku = (product.sku || "").toLowerCase();
        const category = (product.category || "").toLowerCase();
        const desc = (product.description || "").toLowerCase();

        let score = 0;

        // Exact matches
        if (sku === query) score += 100;
        if (name === query) score += 90;

        // Prefix matches
        if (sku.startsWith(query)) score += 80;
        if (name.startsWith(query)) score += 70;

        // All token inclusion
        const allTokensMatch = queryTokens.every(
          (t) =>
            name.includes(t) ||
            sku.includes(t) ||
            category.includes(t) ||
            desc.includes(t)
        );

        if (allTokensMatch) score += 50;

        // Partial matches
        if (name.includes(query)) score += 30;
        if (sku.includes(query)) score += 35;
        if (category.includes(query)) score += 15;
        if (desc.includes(query)) score += 10;

        return { product, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);

    return scored.slice(0, 20); // Top 20 results
  }, [inputValue, products]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-item-index]');
      const activeItem = items[highlightedIndex] as HTMLElement | undefined;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleSelect = (product: ProductSuggestion) => {
    setInputValue(product.name);
    onChange(product.name);
    onSelectProduct(product);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProducts.length - 1
      );
    } else if (e.key === "Enter") {
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredProducts.length
      ) {
        e.preventDefault();
        handleSelect(filteredProducts[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="font-semibold text-primary underline underline-offset-2">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (products.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={cn(
            "w-full pr-8 transition-colors",
            linkedProduct && "border-primary/50 bg-primary/[0.02]"
          )}
          autoComplete="off"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground pointer-events-none">
          <Search className="h-3.5 w-3.5 opacity-30" />
        </div>
      </div>

      {/* Linked Product Info Badge */}
      {linkedProduct && (
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-dashed border-border">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-foreground truncate">
              {linkedProduct.name}
            </span>
            {linkedProduct.sku && (
              <span className="text-[10px] font-mono bg-muted px-1 rounded text-muted-foreground">
                SKU: {linkedProduct.sku}
              </span>
            )}
            {(() => {
              const sqft = extractSqftPerBox(linkedProduct);
              return sqft ? (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                  <Box className="h-2.5 w-2.5" /> {sqft} sqft/box
                </span>
              ) : null;
            })()}
            {linkedProduct.inventory !== null && linkedProduct.inventory !== undefined && (
              <span
                className={cn(
                  "text-[10px] px-1 rounded",
                  Number(linkedProduct.inventory) > 0
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                    : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                )}
              >
                Stock: {linkedProduct.inventory} {linkedProduct.unit || "boxes"}
              </span>
            )}
          </div>
          {onClearProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearProduct();
              }}
              className="text-muted-foreground hover:text-foreground text-[10px] ml-2 underline cursor-pointer"
            >
              Unlink
            </button>
          )}
        </div>
      )}

      {/* Floating Predictive Search Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ minWidth: "320px" }}
        >
          {filteredProducts.length > 0 ? (
            <div className="p-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b mb-1">
                <span>Matching Catalog Products ({filteredProducts.length})</span>
                <span className="text-[10px] lowercase text-muted-foreground/80">
                  ↑↓ navigate · enter select
                </span>
              </div>

              {filteredProducts.map((product, idx) => {
                const isSelected = product.id === productId;
                const isHighlighted = idx === highlightedIndex;
                const priceNum = Number(product.price) || 0;
                const query = inputValue.trim();

                return (
                  <div
                    key={product.id}
                    data-item-index={idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(product)}
                    className={cn(
                      "relative flex flex-col gap-0.5 rounded-sm px-2.5 py-2 text-sm cursor-pointer select-none transition-colors",
                      isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate font-medium">
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="truncate">
                          {highlightMatch(product.name, query)}
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ${priceNum.toFixed(2)}
                        {product.unit ? (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            /{product.unit}
                          </span>
                        ) : null}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {product.sku && (
                        <span className="font-mono text-[11px] bg-muted/80 px-1.5 py-0.2 rounded">
                          {highlightMatch(product.sku, query)}
                        </span>
                      )}
                      {product.category && (
                        <span className="text-[11px] flex items-center gap-0.5">
                          <Tag className="h-2.5 w-2.5 opacity-60" />
                          {product.category}
                        </span>
                      )}
                      {(() => {
                        const sqft = extractSqftPerBox(product);
                        return sqft ? (
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <Box className="h-2.5 w-2.5" />
                            {sqft} sqft/bx
                          </span>
                        ) : null;
                      })()}
                      {product.inventory !== null && product.inventory !== undefined && (
                        <span
                          className={cn(
                            "text-[10px] ml-auto font-medium px-1 rounded",
                            Number(product.inventory) > 0
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                              : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                          )}
                        >
                          {Number(product.inventory) > 0
                            ? `${product.inventory} ${product.unit || "boxes"} in stock`
                            : "Out of stock"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              <p className="font-medium text-foreground">No matching catalog items</p>
              <p className="mt-1">
                You can still keep typing to enter a custom non-inventory item or service.
              </p>
            </div>
          )}

          {inputValue.trim() && (
            <div className="border-t p-1.5 bg-muted/30">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center justify-between rounded hover:bg-accent/40"
              >
                <span>
                  Use custom description: <strong>&ldquo;{inputValue}&rdquo;</strong>
                </span>
                <span className="text-[10px] opacity-70">Esc to close</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
