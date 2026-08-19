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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
  openingBalance: number;
  openingDate: string;
  currentBalance: number;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    description: string | null;
    type: string;
  }>;
}

export default function BankAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccount();
  }, [params.id]);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bank-accounts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
      } else {
        router.push("/dashboard/banking");
      }
    } catch (error) {
      console.error("Error fetching bank account:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!account) {
    return <div>Bank account not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/banking">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {account.name}
            </h1>
            <p className="text-muted-foreground">Bank Account Details</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/banking/transactions">
            View All Transactions
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Account Name</div>
              <div className="font-medium">{account.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Account Type</div>
              <div className="font-medium">{account.type}</div>
            </div>
            {account.bankName && (
              <div>
                <div className="text-sm text-muted-foreground">Bank Name</div>
                <div className="font-medium">{account.bankName}</div>
              </div>
            )}
            {account.accountNumber && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Account Number
                </div>
                <div className="font-mono font-medium">
                  ****{account.accountNumber.slice(-4)}
                </div>
              </div>
            )}
            {account.routingNumber && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Routing Number
                </div>
                <div className="font-mono font-medium">
                  {account.routingNumber}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">
                Opening Balance
              </div>
              <div className="font-medium text-lg">
                ${Number(account.openingBalance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Opening Date
              </div>
              <div className="font-medium">
                {new Date(account.openingDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Current Balance
              </div>
              <div className="font-medium text-2xl">
                ${account.currentBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {account.transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transaction.description || "-"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs bg-muted">
                        {transaction.type}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium font-mono ${
                        Number(transaction.amount) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {Number(transaction.amount) >= 0 ? "+" : ""}
                      ${Math.abs(Number(transaction.amount)).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/dashboard/banking/transactions/${transaction.id}`}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



