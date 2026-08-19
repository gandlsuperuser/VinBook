"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  type: string;
  reference: string | null;
  matched: boolean;
  matchedId: string | null;
  bankAccount: {
    id: string;
    name: string;
  };
}

export default function BankTransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<BankTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransaction();
  }, [params.id]);

  const fetchTransaction = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bank-transactions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransaction(data);
      } else {
        router.push("/dashboard/banking/transactions");
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!transaction) {
    return <div>Transaction not found</div>;
  }

  const getMatchStatusColor = (matched: boolean) => {
    return matched ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/banking/transactions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Transaction Details
            </h1>
            <p className="text-muted-foreground">Bank Transaction</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {new Date(transaction.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="font-medium">
                {transaction.description || "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Bank Account</div>
              <div className="font-medium">
                <Link
                  href={`/dashboard/banking/accounts/${transaction.bankAccount.id}`}
                  className="text-primary hover:underline"
                >
                  {transaction.bankAccount.name}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div>
                <span className="px-2 py-1 rounded text-xs bg-muted">
                  {transaction.type}
                </span>
              </div>
            </div>
            {transaction.reference && (
              <div>
                <div className="text-sm text-muted-foreground">Reference</div>
                <div className="font-medium">{transaction.reference}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Match Status</div>
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs ${getMatchStatusColor(
                    transaction.matched
                  )}`}
                >
                  {transaction.matched ? "Matched" : "Unmatched"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {Number(transaction.amount) >= 0 ? "+" : ""}
              ${Math.abs(Number(transaction.amount)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matched Items */}
      {transaction.matched && transaction.matchedId && (
        <Card>
          <CardHeader>
            <CardTitle>Matched To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Matched ID: {transaction.matchedId}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              (Matching functionality will be expanded in future updates)
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


