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
import { ArrowLeft } from "lucide-react";

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  reference: string | null;
  referenceId: string | null;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export default function LedgerEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [relatedEntries, setRelatedEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntry();
  }, [params.id]);

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ledger/entries/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEntry(data.entry);
        setRelatedEntries(data.relatedEntries || []);
      } else {
        router.push("/dashboard/ledger");
      }
    } catch (error) {
      console.error("Error fetching ledger entry:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!entry) {
    return <div>Ledger entry not found</div>;
  }

  const isJournalEntry = entry.reference === "JOURNAL";
  const entriesToShow = isJournalEntry && relatedEntries.length > 0
    ? relatedEntries
    : [entry];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/ledger">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Ledger Entry Details
            </h1>
            <p className="text-muted-foreground">
              {isJournalEntry ? "Journal Entry" : "Ledger Entry"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entry Information */}
        <Card>
          <CardHeader>
            <CardTitle>Entry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {new Date(entry.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="font-medium">{entry.description}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Account</div>
              <div className="font-medium">
                <Link
                  href={`/dashboard/accounts/${entry.account.id}`}
                  className="text-primary hover:underline"
                >
                  {entry.account.code} - {entry.account.name}
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">
                Type: {entry.account.type}
              </div>
            </div>
            {entry.reference && (
              <div>
                <div className="text-sm text-muted-foreground">Reference</div>
                <div className="font-medium">
                  <span className="px-2 py-1 rounded text-xs bg-muted">
                    {entry.reference}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amounts */}
        <Card>
          <CardHeader>
            <CardTitle>Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Debit</div>
              <div className="font-medium text-lg font-mono">
                {Number(entry.debit) > 0
                  ? `$${Number(entry.debit).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "$0.00"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Credit</div>
              <div className="font-medium text-lg font-mono">
                {Number(entry.credit) > 0
                  ? `$${Number(entry.credit).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "$0.00"}
              </div>
            </div>
            {isJournalEntry && relatedEntries.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Journal Entry
                </div>
                <div className="font-medium text-lg">
                  ${relatedEntries.reduce(
                    (sum, e) => sum + Number(e.debit),
                    0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Related Entries (for journal entries) */}
      {isJournalEntry && relatedEntries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>All Journal Entry Lines</CardTitle>
            <CardDescription>
              This journal entry consists of multiple ledger entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/accounts/${e.account.id}`}
                        className="text-primary hover:underline"
                      >
                        {e.account.code} - {e.account.name}
                      </Link>
                    </TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(e.debit) > 0
                        ? `$${Number(e.debit).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(e.credit) > 0
                        ? `$${Number(e.credit).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



