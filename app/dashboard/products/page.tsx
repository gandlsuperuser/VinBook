"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Eye, FileText, MoreHorizontal, PackagePlus } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { ProductInventoryReportDialog } from "@/components/products/product-inventory-report-dialog";
import { QuickAdjustInventoryDialog } from "@/components/products/quick-adjust-inventory-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductType } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku: string | null;
  type: ProductType;
  price: number;
  cost: number;
  category: string | null;
  inventory: number | null;
  unit: string | null;
  sqftPerBox?: number | null;
  boxesPerPallet?: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProductForReport, setSelectedProductForReport] = useState<Product | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(
          data.products
            ?.map((p: Product) => p.category)
            .filter(Boolean) || []
        )
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, typeFilter, categoryFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (page === 1) {
        fetchProducts();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Services</h1>
          <p className="text-muted-foreground">
            Manage your products and services
          </p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Create Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update product information"
                  : "Add a new product or service"}
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingProduct(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={ProductType.PRODUCT}>Products</SelectItem>
            <SelectItem value={ProductType.SERVICE}>Services</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              {typeFilter === ProductType.PRODUCT || typeFilter === "all" ? (
                <TableHead>Stock (Boxes)</TableHead>
              ) : null}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="text-primary hover:underline hover:text-primary/80 font-semibold transition-colors"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>{product.sku || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        product.type === ProductType.PRODUCT
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {product.type}
                    </span>
                  </TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell>${product.price.toLocaleString()}</TableCell>
                  <TableCell>${product.cost.toLocaleString()}</TableCell>
                  {(typeFilter === ProductType.PRODUCT ||
                    typeFilter === "all") && (
                    <TableCell>
                      {product.inventory !== null ? (
                        <div>
                          <div className="font-bold text-blue-700 dark:text-blue-400">
                            {Number(product.inventory).toLocaleString()} {product.unit || "boxes"}
                          </div>
                          {product.sqftPerBox && Number(product.sqftPerBox) > 0 && (
                            <div className="text-xs text-muted-foreground font-medium">
                              = {(Number(product.inventory) * Number(product.sqftPerBox)).toLocaleString()} sqft
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not tracked</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        product.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Product Actions"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 p-1 bg-white dark:bg-zinc-950 shadow-xl border rounded-lg">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProductForAdjust(product);
                            setIsAdjustOpen(true);
                          }}
                          className="cursor-pointer text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <PackagePlus className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Adjust Inventory
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProductForReport(product);
                            setIsReportOpen(true);
                          }}
                          className="cursor-pointer text-indigo-700 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        >
                          <FileText className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          Movement Report
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingProduct(product);
                            setIsDialogOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(product.id)}
                          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Quick Adjust Inventory Dialog */}
      <QuickAdjustInventoryDialog
        product={selectedProductForAdjust}
        isOpen={isAdjustOpen}
        onClose={() => {
          setIsAdjustOpen(false);
          setSelectedProductForAdjust(null);
        }}
        onSuccess={fetchProducts}
      />

      {/* Product Inventory Movement Report Dialog */}
      <ProductInventoryReportDialog
        productId={selectedProductForReport?.id || null}
        productName={selectedProductForReport?.name}
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setSelectedProductForReport(null);
        }}
        onInventoryUpdated={fetchProducts}
      />
    </div>
  );
}


