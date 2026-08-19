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
import { ArrowLeft, FileText, DollarSign } from "lucide-react";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  notes: string | null;
  createdAt: string;
  invoice: {
    id: string;
    number: string;
    date: string;
    dueDate: string;
    total: number;
    customer: {
      id: string;
      name: string;
      email: string | null;
    };
  };
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [params.id]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPayment(data);
      } else {
        router.push("/dashboard/payments");
      }
    } catch (error) {
      console.error("Error fetching payment:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!payment) {
    return <div>Payment not found</div>;
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case PaymentStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case PaymentStatus.FAILED:
        return "bg-red-100 text-red-800";
      case PaymentStatus.REFUNDED:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/payments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Payment Details
            </h1>
            <p className="text-muted-foreground">Payment Information</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/invoices/${payment.invoice.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            View Invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Amount</div>
              <div className="font-medium text-2xl">
                ${Number(payment.amount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {new Date(payment.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Payment Method</div>
              <div className="font-medium">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>{payment.method.replace("_", " ")}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs ${getStatusColor(
                    payment.status
                  )}`}
                >
                  {payment.status}
                </span>
              </div>
            </div>
            {payment.reference && (
              <div>
                <div className="text-sm text-muted-foreground">Reference</div>
                <div className="font-medium">{payment.reference}</div>
              </div>
            )}
            {payment.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="font-medium">{payment.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle>Related Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Invoice Number</div>
              <div className="font-medium">
                <Link
                  href={`/dashboard/invoices/${payment.invoice.id}`}
                  className="text-primary hover:underline"
                >
                  {payment.invoice.number}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{payment.invoice.customer.name}</div>
              {payment.invoice.customer.email && (
                <div className="text-sm text-muted-foreground">
                  {payment.invoice.customer.email}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Invoice Date</div>
              <div className="font-medium">
                {new Date(payment.invoice.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Due Date</div>
              <div className="font-medium">
                {new Date(payment.invoice.dueDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Invoice Total</div>
              <div className="font-medium text-lg">
                ${Number(payment.invoice.total).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Payment Amount</div>
              <div className="font-medium text-green-600">
                ${Number(payment.amount).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Recorded on {new Date(payment.createdAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment ID:</span>
              <span className="font-mono text-sm">{payment.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${getStatusColor(
                  payment.status
                )}`}
              >
                {payment.status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



