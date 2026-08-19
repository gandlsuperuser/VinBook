"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, Package, DollarSign } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductType } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  type: ProductType;
  price: number;
  cost: number;
  category: string | null;
  inventory: number | null;
  unit: string | null;
  location: string | null;
  isActive: boolean;
  invoiceItems: Array<{
    id: string;
    quantity: number;
    rate: number;
    amount: number;
    invoice: {
      id: string;
      number: string;
      date: string;
      customer: {
        name: string;
      };
    };
  }>;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        router.push("/dashboard/products");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  const profitMargin =
    product.price > 0
      ? ((product.price - product.cost) / product.price) * 100
      : 0;

  const inventoryValue =
    product.inventory !== null && product.cost
      ? product.inventory * product.cost
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">Product Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Package className="mr-2 h-4 w-4" />
            Inventory
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Product
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    product.type === ProductType.PRODUCT
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {product.type}
                </span>
              </div>
            </div>
            {product.sku && (
              <div>
                <div className="text-sm text-muted-foreground">SKU</div>
                <div className="font-medium">{product.sku}</div>
              </div>
            )}
            {product.category && (
              <div>
                <div className="text-sm text-muted-foreground">Category</div>
                <div className="font-medium">{product.category}</div>
              </div>
            )}
            {product.location && (
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium">{product.location}</div>
              </div>
            )}
            {product.description && (
              <div>
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="font-medium">{product.description}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    product.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Price</div>
              <div className="font-medium text-lg">
                ${product.price.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cost</div>
              <div className="font-medium">${product.cost.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Profit Margin</div>
              <div className="font-medium">{profitMargin.toFixed(2)}%</div>
            </div>
            {product.type === ProductType.PRODUCT && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Inventory</div>
                  <div className="font-medium">
                    {product.inventory !== null
                      ? `${product.inventory} ${product.unit || "pcs"}`
                      : "Not tracked"}
                  </div>
                </div>
                {product.inventory !== null && product.cost > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Inventory Value
                    </div>
                    <div className="font-medium">
                      ${inventoryValue.toLocaleString()}
                    </div>
                  </div>
                )}
                {product.inventory !== null && product.inventory < 10 && (
                  <div className="text-sm text-orange-600">
                    Low stock warning
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Usage */}
      {product.invoiceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Usage</CardTitle>
            <CardDescription>
              Recent invoices using this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.invoiceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${item.invoice.id}`}
                        className="text-primary hover:underline"
                      >
                        {item.invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>{item.invoice.customer.name}</TableCell>
                    <TableCell>
                      {new Date(item.invoice.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      ${item.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <ProductForm
            product={product}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchProduct();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}



