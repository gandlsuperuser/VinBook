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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Eye } from "lucide-react";
import { BankAccountForm } from "@/components/banking/bank-account-form";
import { BankAccountType } from "@prisma/client";

interface BankAccount {
  id: string;
  name: string;
  type: BankAccountType;
  bankName: string | null;
  accountNumber: string | null;
  currentBalance: number;
  openingBalance: number;
  _count: {
    transactions: number;
  };
}

export default function BankingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bank-accounts");
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
    fetchAccounts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banking</h1>
          <p className="text-muted-foreground">
            Manage bank accounts and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/banking/transactions">
              View Transactions
            </Link>
          </Button>
          <Button onClick={() => {
            setEditingAccount(null);
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bank Account
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit Bank Account" : "Create Bank Account"}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount
                    ? "Update bank account information"
                    : "Add a new bank account to track transactions"}
                </DialogDescription>
              </DialogHeader>
              <BankAccountForm
                account={editingAccount}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingAccount(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No bank accounts found. Create your first bank account to get started.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs bg-muted">
                      {account.type.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>{account.bankName || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {account.accountNumber
                      ? `****${account.accountNumber.slice(-4)}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium font-mono">
                    ${account.currentBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {account._count.transactions}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/banking/accounts/${account.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


