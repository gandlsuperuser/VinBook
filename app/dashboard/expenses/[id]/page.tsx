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
import { ArrowLeft, Pencil, Download, FileText } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseStatus, PaymentMethod } from "@prisma/client";

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string | null;
  description: string | null;
  receipt: string | null;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  notes: string | null;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [params.id]);

  const fetchExpense = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/expenses/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setExpense(data);
      } else {
        router.push("/dashboard/expenses");
      }
    } catch (error) {
      console.error("Error fetching expense:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!expense) {
    return <div>Expense not found</div>;
  }

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.PAID:
        return "bg-green-100 text-green-800";
      case ExpenseStatus.APPROVED:
        return "bg-blue-100 text-blue-800";
      case ExpenseStatus.REIMBURSED:
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/expenses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expense Details</h1>
            <p className="text-muted-foreground">Expense Information</p>
          </div>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Expense
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Information */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Amount</div>
              <div className="font-medium text-2xl">
                ${Number(expense.amount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {new Date(expense.date).toLocaleDateString()}
              </div>
            </div>
            {expense.category && (
              <div>
                <div className="text-sm text-muted-foreground">Category</div>
                <div className="font-medium">{expense.category}</div>
              </div>
            )}
            {expense.vendor && (
              <div>
                <div className="text-sm text-muted-foreground">Vendor</div>
                <div className="font-medium">
                  <Link
                    href={`/dashboard/vendors/${expense.vendor.id}`}
                    className="text-primary hover:underline"
                  >
                    {expense.vendor.name}
                  </Link>
                </div>
                {expense.vendor.email && (
                  <div className="text-sm text-muted-foreground">
                    {expense.vendor.email}
                  </div>
                )}
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Payment Method</div>
              <div className="font-medium">
                {expense.paymentMethod.replace("_", " ")}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs ${getStatusColor(
                    expense.status
                  )}`}
                >
                  {expense.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {expense.receipt ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Receipt uploaded
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={expense.receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        View Receipt
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  {expense.receipt}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No receipt attached
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {expense.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{expense.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {expense.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense information</DialogDescription>
          </DialogHeader>
          <ExpenseForm
            expense={expense}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchExpense();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}



