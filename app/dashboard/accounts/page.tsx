"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Eye, ChevronRight, ChevronDown, Sparkles } from "lucide-react";
import { AccountForm } from "@/components/accounts/account-form";
import { AccountType } from "@prisma/client";

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  children: Account[];
  _count: { entries: number };
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flatAccounts, setFlatAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/accounts");
      const data = await response.json();
      setAccounts(data.accounts || []);
      setFlatAccounts(data.flatAccounts || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
    fetchAccounts();
  };

  const handleInitializeAccounts = async () => {
    if (
      !confirm(
        "This will create default chart of accounts. Accounts that already exist will be skipped. Continue?"
      )
    ) {
      return;
    }

    setInitializing(true);
    try {
      const response = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initialize" }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(
          data.message || `Created ${data.created} default accounts successfully!`
        );
        fetchAccounts();
      } else {
        alert(data.error || "Failed to initialize accounts");
      }
    } catch (error) {
      console.error("Error initializing accounts:", error);
      alert("Failed to initialize accounts");
    } finally {
      setInitializing(false);
    }
  };

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const renderAccountTree = (account: Account, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const indent = level * 24;

    return (
      <div key={account.id}>
        <div
          className="flex items-center gap-2 py-2 px-4 hover:bg-muted/50 border-b"
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(account.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2 font-mono text-sm">{account.code}</div>
            <div className="col-span-4 font-medium">{account.name}</div>
            <div className="col-span-2">
              <span className="px-2 py-1 rounded text-xs bg-muted">
                {account.type}
              </span>
            </div>
            <div className="col-span-2 text-right font-mono">
              ${account.balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="col-span-2 text-right flex gap-2 justify-end">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/accounts/${account.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingAccount(account);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {account.children.map((child) =>
              renderAccountTree(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const getAccountsByType = (type: AccountType) => {
    return accounts.filter((acc) => acc.type === type);
  };

  const accountTypes = [
    AccountType.ASSET,
    AccountType.LIABILITY,
    AccountType.EQUITY,
    AccountType.REVENUE,
    AccountType.EXPENSE,
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your chart of accounts
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button
              variant="outline"
              onClick={handleInitializeAccounts}
              disabled={initializing}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {initializing ? "Initializing..." : "Initialize Default Accounts"}
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingAccount(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Account" : "Create Account"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Update account information"
                  : "Add a new account to your chart of accounts"}
              </DialogDescription>
            </DialogHeader>
            <AccountForm
              account={editingAccount}
              accounts={flatAccounts}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingAccount(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="rounded-md border">
          <div className="bg-muted px-4 py-2 font-medium grid grid-cols-12 gap-4 border-b">
            <div className="col-span-2">Code</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {accountTypes.map((type) => {
            const typeAccounts = getAccountsByType(type);
            if (typeAccounts.length === 0) return null;

            return (
              <div key={type}>
                <div className="bg-muted/50 px-4 py-2 font-semibold border-b">
                  {type} Accounts
                </div>
                {typeAccounts.map((account) => renderAccountTree(account, 0))}
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No accounts found. Create your first account to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

