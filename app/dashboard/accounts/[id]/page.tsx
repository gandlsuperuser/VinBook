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
import { ArrowLeft, Pencil } from "lucide-react";
import { AccountType } from "@prisma/client";

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  totalBalance: number;
  parent: {
    id: string;
    code: string;
    name: string;
  } | null;
  children: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  entries: Array<{
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    reference: string | null;
    referenceId: string | null;
  }>;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccount();
  }, [params.id]);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
      } else {
        router.push("/dashboard/accounts");
      }
    } catch (error) {
      console.error("Error fetching account:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!account) {
    return <div>Account not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {account.code} - {account.name}
            </h1>
            <p className="text-muted-foreground">Account Details</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Account Code</div>
              <div className="font-mono font-medium">{account.code}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Account Name</div>
              <div className="font-medium">{account.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Account Type</div>
              <div>
                <span className="px-2 py-1 rounded text-xs bg-muted">
                  {account.type}
                </span>
              </div>
            </div>
            {account.parent && (
              <div>
                <div className="text-sm text-muted-foreground">Parent Account</div>
                <div className="font-medium">
                  <Link
                    href={`/dashboard/accounts/${account.parent.id}`}
                    className="text-primary hover:underline"
                  >
                    {account.parent.code} - {account.parent.name}
                  </Link>
                </div>
              </div>
            )}
            {account.children.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Sub-Accounts</div>
                <div className="space-y-1">
                  {account.children.map((child) => (
                    <div key={child.id}>
                      <Link
                        href={`/dashboard/accounts/${child.id}`}
                        className="text-primary hover:underline"
                      >
                        {child.code} - {child.name}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Information */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Account Balance</div>
              <div className="font-medium text-2xl">
                ${account.balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            {account.children.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Balance (Including Sub-Accounts)
                </div>
                <div className="font-medium text-lg">
                  ${account.totalBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Recent ledger entries for this account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {account.entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.entries.map((entry, index) => {
                  // Calculate running balance
                  const previousEntries = account.entries
                    .slice(index + 1)
                    .reduce(
                      (sum, e) => sum + Number(e.debit) - Number(e.credit),
                      0
                    );
                  const runningBalance =
                    account.balance - previousEntries - Number(entry.debit) + Number(entry.credit);

                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>
                        {entry.reference || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(entry.debit) > 0
                          ? `$${Number(entry.debit).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(entry.credit) > 0
                          ? `$${Number(entry.credit).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${runningBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



