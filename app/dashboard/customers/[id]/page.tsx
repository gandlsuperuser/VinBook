"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Download } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: any;
  shippingAddress: any;
  paymentTerms: string | null;
  creditLimit: number | null;
  taxId: string | null;
  notes: string | null;
  outstandingBalance: number;
  totalInvoices: number;
  totalPaid: number;
  prepaidCredit: number;
  invoices: Array<{
    id: string;
    number: string;
    date: string;
    status: string;
    total: number;
    payments: Array<{ amount: number; date: string }>;
  }>;
  estimates: Array<{
    id: string;
    number: string;
    date: string;
    status: string;
    total: number;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      } else {
        router.push("/dashboard/customers");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDetails = async () => {
    if (!customer) return;

    try {
      // Create a hidden container for PDF generation
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.width = "1100px"; // Wide enough for 6-column table
      pdfContainer.style.padding = "40px";
      pdfContainer.style.backgroundColor = "#ffffff";
      pdfContainer.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      document.body.appendChild(pdfContainer);

      // Build address lines
      const billingAddressLines: string[] = [];
      if (customer.billingAddress) {
        const addr = customer.billingAddress;
        if (addr.street) billingAddressLines.push(addr.street);
        const cityStateZip = [addr.city, addr.state, addr.zip]
          .filter(Boolean)
          .join(", ");
        if (cityStateZip) billingAddressLines.push(cityStateZip);
        if (addr.country) billingAddressLines.push(addr.country);
      }

      // Format date
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
      };

      // Format currency
      const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      // Outstanding balance display (exact value: positive = prepaid credit remaining, negative = owes)
      const ob = customer.outstandingBalance ?? 0;
      const obDisplay =
        ob > 0
          ? `+$${ob.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : ob < 0
            ? `-$${Math.abs(ob).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : formatCurrency(0);
      const obColor = ob > 0 ? "#1b5e20" : ob < 0 ? "#c62828" : "#000000";

      pdfContainer.innerHTML = `
        <style>
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            box-sizing: border-box;
          }
          body {
            color: #334155;
          }
        </style>
        <div style="margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 6px; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2;">
            Customer Details Report
          </h1>
          <div style="font-size: 10px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
            Generated ${new Date().toLocaleString()}
          </div>
        </div>

        <!-- Customer Information -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 12px; font-weight: 700; margin-bottom: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
            Primary Information
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 10px; line-height: 1.5;">
            <div>
              <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Name</div>
              <div style="color: #0f172a; font-weight: 700; font-size: 11px;">${customer.name}</div>
            </div>
            ${customer.email ? `
              <div>
                <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Email</div>
                <div style="color: #0f172a; font-weight: 500;">${customer.email}</div>
              </div>
            ` : ""}
            ${customer.phone ? `
              <div>
                <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Phone</div>
                <div style="color: #0f172a; font-weight: 500;">${customer.phone}</div>
              </div>
            ` : ""}
            ${customer.taxId ? `
              <div>
                <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tax ID</div>
                <div style="color: #0f172a; font-weight: 500;">${customer.taxId}</div>
              </div>
            ` : ""}
            ${billingAddressLines.length > 0 ? `
              <div style="grid-column: 1 / -1;">
                <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Billing Address</div>
                <div style="color: #0f172a; font-weight: 500;">
                  ${billingAddressLines.map((line) => `<div style="margin-bottom: 2px;">${line}</div>`).join("")}
                </div>
              </div>
            ` : ""}
            ${customer.paymentTerms ? `
              <div>
                <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Terms</div>
                <div style="color: #0f172a; font-weight: 500;">${customer.paymentTerms}</div>
              </div>
            ` : ""}
            ${customer.creditLimit ? `
              <div>
                <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Credit Limit</div>
                <div style="color: #0f172a; font-weight: 600;">${formatCurrency(customer.creditLimit)}</div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Financial Summary -->
        <div style="margin-bottom: 28px;">
          <h2 style="font-size: 12px; font-weight: 700; margin-bottom: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
            Financial Summary
          </h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 10px;">
            <div style="padding: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-weight: 600; color: #64748b; margin-bottom: 4px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Total Invoices</div>
              <div style="font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2;">
                ${formatCurrency(customer.totalInvoices || 0)}
              </div>
            </div>
            <div style="padding: 14px; background-color: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0;">
              <div style="font-weight: 600; color: #065f46; margin-bottom: 4px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Total Paid</div>
              <div style="font-size: 16px; font-weight: 700; color: #047857; line-height: 1.2;">
                ${formatCurrency(customer.totalPaid || 0)}
              </div>
            </div>
            <div style="padding: 14px; background-color: ${ob > 0 ? '#ecfdf5' : ob < 0 ? '#fef2f2' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${ob > 0 ? '#a7f3d0' : ob < 0 ? '#fecaca' : '#e2e8f0'};">
              <div style="font-weight: 600; color: ${ob > 0 ? '#065f46' : ob < 0 ? '#991b1b' : '#64748b'}; margin-bottom: 4px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Outstanding Balance</div>
              <div style="font-size: 16px; font-weight: 800; color: ${ob > 0 ? '#047857' : ob < 0 ? '#b91c1c' : '#0f172a'}; line-height: 1.2;">
                ${obDisplay}
              </div>
            </div>
            <div style="padding: 14px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
              <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Prepaid Credit</div>
              <div style="font-size: 16px; font-weight: 700; color: #1d4ed8; line-height: 1.2;">
                ${formatCurrency(customer.prepaidCredit || 0)}
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice History -->
        ${customer.invoices.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 12px; font-weight: 700; margin-bottom: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
              Invoice History
            </h2>
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">
                <colgroup>
                  <col style="width: 18%;" />
                  <col style="width: 16%;" />
                  <col style="width: 14%;" />
                  <col style="width: 18%;" />
                  <col style="width: 17%;" />
                  <col style="width: 17%;" />
                </colgroup>
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                    <th style="text-align: left; padding: 12px 16px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Invoice #</th>
                    <th style="text-align: left; padding: 12px 16px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Date</th>
                    <th style="text-align: center; padding: 12px 16px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
                    <th style="text-align: right; padding: 12px 16px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Amount</th>
                    <th style="text-align: right; padding: 12px 16px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Paid</th>
                    <th style="text-align: right; padding: 12px 16px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  ${customer.invoices.map((inv: any, index: number) => {
        const paid = inv.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const remaining = Number(inv.total) - paid;

        const statusColors: { [key: string]: string } = {
          PAID: "#047857",
          SENT: "#1d4ed8",
          PARTIAL: "#b45309",
          OVERDUE: "#b91c1c",
          DRAFT: "#475569",
        };
        const statusBg: { [key: string]: string } = {
          PAID: "#d1fae5",
          SENT: "#dbeafe",
          PARTIAL: "#fef3c7",
          OVERDUE: "#fee2e2",
          DRAFT: "#f1f5f9",
        };

        return `
                      <tr style="border-bottom: ${index === customer.invoices.length - 1 ? 'none' : '1px solid #e2e8f0'}; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                        <td style="padding: 12px 16px; font-weight: 600; color: #0f172a; white-space: nowrap;">${inv.number}</td>
                        <td style="padding: 12px 16px; color: #334155; white-space: nowrap;">${formatDate(inv.date)}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                          <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${statusBg[inv.status] || "#f1f5f9"}; color: ${statusColors[inv.status] || "#475569"}; white-space: nowrap;">
                            ${inv.status}
                          </span>
                        </td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #0f172a; white-space: nowrap;">${formatCurrency(Number(inv.total))}</td>
                        <td style="padding: 12px 16px; text-align: right; color: ${paid > 0 ? '#047857' : '#64748b'}; font-weight: ${paid > 0 ? '600' : '400'}; white-space: nowrap;">${formatCurrency(paid)}</td>
                        <td style="padding: 12px 16px; text-align: right; color: ${remaining > 0 ? '#b91c1c' : '#64748b'}; font-weight: ${remaining > 0 ? '600' : '400'}; white-space: nowrap;">${formatCurrency(remaining)}</td>
                      </tr>
                    `;
      }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <div style="padding: 24px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc;">
            <div style="font-weight: 500; font-size: 11px; color: #64748b;">No invoices found for this customer</div>
          </div>
        `}

        <!-- Footer -->
        <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #000000; font-size: 8px; color: #000000; text-align: center; font-weight: 600; line-height: 1.3;">
          <div style="margin-bottom: 4px; line-height: 1.2;">This report was generated on ${new Date().toLocaleString()}</div>
          <div style="font-weight: 700; color: #000000; font-size: 9px; line-height: 1.2;">FastKeep Accounting System</div>
        </div>
      `;

      // Generate PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5, // Reduced from 3 for smaller file size
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      document.body.removeChild(pdfContainer);

      // Use JPEG with quality 0.8 heavily reduces file size compared to PNG
      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgPdfHeight = imgHeight * ratio;
      let heightLeft = imgPdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
      }

      // Save PDF
      pdf.save(`${customer.name.replace(/\s+/g, "_")}_details_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!customer) {
    return <div>Customer not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadDetails}>
            <Download className="mr-2 h-4 w-4" />
            Download Details
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchCustomer();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.billingAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {customer.billingAddress.street && (
                    <div>{customer.billingAddress.street}</div>
                  )}
                  {(customer.billingAddress.city ||
                    customer.billingAddress.state ||
                    customer.billingAddress.zip) && (
                      <div>
                        {[
                          customer.billingAddress.city,
                          customer.billingAddress.state,
                          customer.billingAddress.zip,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  {customer.billingAddress.country && (
                    <div>{customer.billingAddress.country}</div>
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
                {customer.paymentTerms || "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Credit Limit</div>
              <div className="font-medium">
                {customer.creditLimit
                  ? `$${customer.creditLimit.toLocaleString()}`
                  : "Not set"}
              </div>
            </div>
            {customer.taxId && (
              <div>
                <div className="text-sm text-muted-foreground">Tax ID</div>
                <div className="font-medium">{customer.taxId}</div>
              </div>
            )}

            {/* Financial Summary Section */}
            <div className="pt-4 border-t">
              <div className="text-sm font-semibold mb-3">Financial Summary</div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="font-medium text-lg">
                    ${(customer.totalInvoices || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className="font-medium text-lg text-green-600">
                    ${(customer.totalPaid || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Outstanding Balance
                  </div>
                  <div className={`font-medium text-lg ${(customer.outstandingBalance ?? 0) > 0 ? "text-green-600" : (customer.outstandingBalance ?? 0) < 0 ? "text-red-600" : ""}`}>
                    {(customer.outstandingBalance ?? 0) > 0
                      ? `+$${customer.outstandingBalance!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : (customer.outstandingBalance ?? 0) < 0
                        ? `-$${Math.abs(customer.outstandingBalance!).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${(0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(customer.totalInvoices || 0) > 0 || (customer.prepaidCredit || 0) > 0 ? (
                      <>
                        ${(customer.prepaidCredit || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} - ${(customer.totalInvoices || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ={" "}
                        {(customer.outstandingBalance ?? 0) > 0
                          ? `+$${(customer.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : (customer.outstandingBalance ?? 0) < 0
                            ? `-$${Math.abs(customer.outstandingBalance!).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `$${(0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </>
                    ) : (
                      "No invoices or prepaid credit"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Prepaid Credit
                  </div>
                  <div className="font-medium text-lg text-blue-600">
                    ${(customer.prepaidCredit || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            All invoices for this customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customer.invoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No invoices found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.map((invoice) => {
                  const paid = invoice.payments.reduce(
                    (sum, p) => sum + Number(p.amount),
                    0
                  );
                  const remaining = Number(invoice.total) - paid;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="text-primary hover:underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${invoice.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : invoice.status === "SENT"
                              ? "bg-blue-100 text-blue-800"
                              : invoice.status === "PARTIAL"
                                ? "bg-yellow-100 text-yellow-800"
                                : invoice.status === "OVERDUE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {invoice.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(invoice.total).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${paid.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        ${remaining.toLocaleString(undefined, {
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

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information</DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchCustomer();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

