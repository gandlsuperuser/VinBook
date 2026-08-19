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
import { ArrowLeft, Pencil, Mail, Phone, MapPin } from "lucide-react";
import { VendorForm } from "@/components/vendors/vendor-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: any;
  paymentTerms: string | null;
  taxId: string | null;
  notes: string | null;
  outstandingBalance: number;
  expenses: Array<{
    id: string;
    date: string;
    amount: number;
    description: string | null;
    status: string;
    category: string | null;
  }>;
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchVendor();
  }, [params.id]);

  const fetchVendor = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vendors/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      } else {
        router.push("/dashboard/vendors");
      }
    } catch (error) {
      console.error("Error fetching vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!vendor) {
    return <div>Vendor not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/vendors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
            <p className="text-muted-foreground">Vendor Details</p>
          </div>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Vendor
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.email}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {vendor.address.street && (
                    <div>{vendor.address.street}</div>
                  )}
                  {(vendor.address.city ||
                    vendor.address.state ||
                    vendor.address.zip) && (
                    <div>
                      {[
                        vendor.address.city,
                        vendor.address.state,
                        vendor.address.zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {vendor.address.country && (
                    <div>{vendor.address.country}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Payment Terms</div>
              <div className="font-medium">
                {vendor.paymentTerms || "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Outstanding Balance
              </div>
              <div className="font-medium text-lg">
                ${vendor.outstandingBalance.toLocaleString()}
              </div>
            </div>
            {vendor.taxId && (
              <div>
                <div className="text-sm text-muted-foreground">Tax ID</div>
                <div className="font-medium">{vendor.taxId}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>
            All expenses for this vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendor.expenses.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No expenses found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell>{expense.category || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          expense.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : expense.status === "APPROVED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {expense.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(expense.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {vendor.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor information</DialogDescription>
          </DialogHeader>
          <VendorForm
            vendor={vendor}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchVendor();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}



