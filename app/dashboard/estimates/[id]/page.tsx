"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import jsPDFImport from "jspdf";
import html2canvas from "html2canvas";

const jsPDF = (jsPDFImport as any).jsPDF || jsPDFImport;
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Mail, Download, FileText, Pencil, Trash2, Copy } from "lucide-react";
import { EstimateStatus } from "@prisma/client";
import { EstimateForm } from "@/components/estimates/estimate-form";

interface Estimate {
  id: string;
  number: string;
  date: string;
  expiryDate: string | null;
  status: EstimateStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  poNumber: string | null;
  sideMark: string | null;
  salesRep: string | null;
  notes: string | null;
  terms: string | null;
  convertedToInvoice: boolean;
  convertedInvoiceId: string | null;
  organization?: {
    id: string;
    name: string;
    settings: any;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    billingAddress: any;
  };
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    product: {
      id?: string;
      name: string;
      sku: string | null;
    } | null;
  }>;
}

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchEstimate();
  }, [params.id]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/estimates/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEstimate(data);
      } else {
        router.push("/dashboard/estimates");
      }
    } catch (error) {
      console.error("Error fetching estimate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: EstimateStatus) => {
    try {
      const response = await fetch(`/api/estimates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchEstimate();
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleConvertToInvoice = async () => {
    setConverting(true);
    try {
      const response = await fetch(`/api/estimates/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/invoices/${data.invoice.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to convert estimate");
        setConverting(false);
      }
    } catch (error) {
      console.error("Error converting estimate:", error);
      alert("Failed to convert estimate");
      setConverting(false);
    }
  };

  const handleDuplicateEstimate = async () => {
    setDuplicating(true);
    try {
      const response = await fetch(`/api/estimates/${params.id}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        const newEstimate = await response.json();
        router.push(`/dashboard/estimates/${newEstimate.id}`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to duplicate estimate");
        setDuplicating(false);
      }
    } catch (error) {
      console.error("Error duplicating estimate:", error);
      alert("Failed to duplicate estimate");
      setDuplicating(false);
    }
  };

  const handleDeleteEstimate = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/estimates/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/estimates");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete estimate");
        setDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting estimate:", error);
      alert("Failed to delete estimate");
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!estimate) return;

    const addressLines: string[] = [];
    if (estimate.customer.billingAddress) {
      const addr = estimate.customer.billingAddress;
      if (addr.street) addressLines.push(addr.street);
      const cityStateZip = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
      if (cityStateZip) addressLines.push(cityStateZip);
      if (addr.country) addressLines.push(addr.country);
    }

    const orgAddressLines: string[] = [];
    if (estimate.organization?.settings && typeof estimate.organization.settings === "object") {
      const orgAddr = estimate.organization.settings.address;
      if (orgAddr) {
        if (orgAddr.street) orgAddressLines.push(orgAddr.street);
        const orgCityStateZip = [orgAddr.city, orgAddr.state, orgAddr.zip].filter(Boolean).join(", ");
        if (orgCityStateZip) orgAddressLines.push(orgCityStateZip);
        if (orgAddr.country) orgAddressLines.push(orgAddr.country);
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote-${estimate.number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20mm; background: white; }
          @media print {
            body { padding: 0; }
            @page { margin: 20mm; size: A4; }
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
          .header-left { flex: 1; }
          .header-right { flex: 1; text-align: right; }
          .logo { max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 12px; display: block; }
          h1 { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .org-info { font-size: 14px; line-height: 1.6; }
          .org-name { font-weight: 600; margin-bottom: 5px; }
          .bill-to { margin-bottom: 30px; }
          .bill-to h2 { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
          .bill-to .info { font-size: 14px; line-height: 1.6; }
          .bill-to .name { font-weight: 600; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead tr { border-bottom: 2px solid #000; }
          th { text-align: left; padding: 10px 0; font-weight: bold; }
          th.center { text-align: center; width: 80px; }
          th.right { text-align: right; width: 100px; }
          tbody tr { border-bottom: 1px solid #ddd; }
          td { padding: 10px 0; }
          td.center { text-align: center; }
          td.right { text-align: right; }
          .item-desc { font-weight: 500; }
          .item-sku { font-size: 11px; color: #666; }
          .totals { margin-left: auto; width: 300px; margin-bottom: 20px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-final { border-top: 2px solid #000; margin-top: 5px; padding-top: 10px; font-weight: bold; font-size: 16px; }
          .notes-section { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          .notes-section h3 { font-weight: bold; margin-bottom: 5px; }
          .notes-section .content { white-space: pre-wrap; font-size: 12px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 30px;">
          <div class="header">
            <div class="header-left">
              ${estimate.organization?.settings?.logoUrl ? `<img class="logo" src="${estimate.organization.settings.logoUrl}" />` : ""}
              <h1>QUOTE / ESTIMATE</h1>
              <div class="org-info">
                <div class="org-name">${estimate.organization?.name || ""}</div>
                ${estimate.organization?.settings?.email ? `<div>${estimate.organization.settings.email}</div>` : ""}
                ${estimate.organization?.settings?.phone ? `<div>${estimate.organization.settings.phone}</div>` : ""}
                ${orgAddressLines.map((line) => `<div>${line}</div>`).join("")}
              </div>
            </div>
            <div class="header-right">
              <div style="margin-bottom: 6px;"><strong>Quote #:</strong> ${estimate.number}</div>
              ${estimate.poNumber ? `<div style="margin-bottom: 6px;"><strong>PO #:</strong> ${estimate.poNumber}</div>` : ""}
              ${estimate.salesRep ? `<div style="margin-bottom: 6px;"><strong>Sales Rep:</strong> ${estimate.salesRep}</div>` : ""}
              <div style="margin-bottom: 6px;"><strong>Date:</strong> ${new Date(estimate.date).toLocaleDateString()}</div>
              ${estimate.expiryDate ? `<div><strong>Expiry Date:</strong> ${new Date(estimate.expiryDate).toLocaleDateString()}</div>` : ""}
            </div>
          </div>
        </div>

        <div class="bill-to">
          <h2>Bill To:</h2>
          <div class="info">
            <div class="name">${estimate.customer.name}</div>
            ${estimate.customer.email ? `<div>${estimate.customer.email}</div>` : ""}
            ${addressLines.map((line) => `<div>${line}</div>`).join("")}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="center">Qty</th>
              <th class="right">Rate</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${estimate.items.map((item) => `
              <tr>
                <td>
                  <div class="item-desc">${item.description}</div>
                  ${item.product?.sku ? `<div class="item-sku">SKU: ${item.product.sku}</div>` : ""}
                </td>
                <td class="center">${item.quantity}</td>
                <td class="right">$${Number(item.rate).toFixed(2)}</td>
                <td class="right">$${Number(item.amount).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${Number(estimate.subtotal).toFixed(2)}</span>
          </div>
          ${estimate.tax > 0 ? `<div class="total-row"><span>Tax:</span><span>$${Number(estimate.tax).toFixed(2)}</span></div>` : ""}
          ${estimate.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-$${Number(estimate.discount).toFixed(2)}</span></div>` : ""}
          <div class="total-row total-final">
            <span>Total:</span>
            <span>$${Number(estimate.total).toFixed(2)}</span>
          </div>
        </div>

        ${estimate.notes || estimate.terms ? `
          <div class="notes-section">
            ${estimate.notes ? `<div><h3>Notes:</h3><div class="content">${estimate.notes}</div></div>` : ""}
            ${estimate.terms ? `<div><h3>Terms & Conditions:</h3><div class="content">${estimate.terms}</div></div>` : ""}
          </div>
        ` : ""}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      alert("Please allow popups for this site to download the PDF.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!estimate) {
    return <div>Estimate not found</div>;
  }

  const isExpired =
    estimate.expiryDate && new Date(estimate.expiryDate) < new Date();

  const estimateForForm = estimate ? {
    id: estimate.id,
    customerId: estimate.customer.id,
    date: estimate.date ? new Date(estimate.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expiryDate: estimate.expiryDate ? new Date(estimate.expiryDate).toISOString().split('T')[0] : null,
    status: estimate.status,
    items: estimate.items.map(item => ({
      id: item.id,
      productId: item.productId || undefined,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount) || 0,
    })),
    subtotal: Number(estimate.subtotal) || 0,
    tax: Number(estimate.tax) || 0,
    discount: Number(estimate.discount) || 0,
    total: Number(estimate.total) || 0,
    poNumber: estimate.poNumber || undefined,
    sideMark: estimate.sideMark || undefined,
    salesRep: estimate.salesRep || undefined,
    notes: estimate.notes || undefined,
    terms: estimate.terms || undefined,
  } : null;

  return (
    <div className="space-y-6">
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote / Estimate</DialogTitle>
            <DialogDescription>
              Update quote information
            </DialogDescription>
          </DialogHeader>
          {estimateForForm && (
            <EstimateForm
              estimate={estimateForForm}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                fetchEstimate();
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote / Estimate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEstimate}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/estimates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {estimate.number}
            </h1>
            <p className="text-muted-foreground">Quote / Estimate Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!estimate.convertedToInvoice && (
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Quote
            </Button>
          )}
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
          <Button
            variant="outline"
            onClick={handleDuplicateEstimate}
            disabled={duplicating}
          >
            <Copy className="mr-2 h-4 w-4" />
            {duplicating ? "Duplicating..." : "Duplicate"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>

          {estimate.status === EstimateStatus.DRAFT && (
            <Button onClick={() => handleStatusUpdate(EstimateStatus.SENT)}>
              Mark as Sent
            </Button>
          )}
          {estimate.status === EstimateStatus.SENT && (
            <Button onClick={() => handleStatusUpdate(EstimateStatus.ACCEPTED)}>
              Mark as Accepted
            </Button>
          )}

          {!estimate.convertedToInvoice && (
            <>
              <Button onClick={() => setIsConvertDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Convert to Invoice
              </Button>
              <Dialog
                open={isConvertDialogOpen}
                onOpenChange={setIsConvertDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convert Estimate to Invoice</DialogTitle>
                    <DialogDescription>
                      This will create a new invoice from this quote/estimate. The
                      estimate will be marked as converted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsConvertDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConvertToInvoice}
                      disabled={converting}
                    >
                      {converting ? "Converting..." : "Convert"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {estimate.convertedToInvoice && estimate.convertedInvoiceId && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/invoices/${estimate.convertedInvoiceId}`}>
                View Invoice
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* From Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>From</span>
              {estimate.organization?.settings?.logoUrl && (
                <img
                  src={estimate.organization.settings.logoUrl}
                  alt="Company Logo"
                  className="h-9 max-w-[120px] object-contain"
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{estimate.organization?.name || "My Company"}</div>
              {estimate.organization?.settings && typeof estimate.organization.settings === "object" && (
                <>
                  {estimate.organization.settings.email && (
                    <div className="text-sm text-muted-foreground">
                      {estimate.organization.settings.email}
                    </div>
                  )}
                  {estimate.organization.settings.phone && (
                    <div className="text-sm text-muted-foreground">
                      {estimate.organization.settings.phone}
                    </div>
                  )}
                  {estimate.organization.settings.address && (
                    <div className="text-sm text-muted-foreground">
                      {estimate.organization.settings.address.street && (
                        <div>{estimate.organization.settings.address.street}</div>
                      )}
                      {(estimate.organization.settings.address.city ||
                        estimate.organization.settings.address.state ||
                        estimate.organization.settings.address.zip) && (
                          <div>
                            {[
                              estimate.organization.settings.address.city,
                              estimate.organization.settings.address.state,
                              estimate.organization.settings.address.zip,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      {estimate.organization.settings.address.country && (
                        <div>{estimate.organization.settings.address.country}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{estimate.customer.name}</div>
              {estimate.customer.email && (
                <div className="text-sm text-muted-foreground">
                  {estimate.customer.email}
                </div>
              )}
              {estimate.customer.billingAddress && (
                <div className="text-sm text-muted-foreground">
                  {estimate.customer.billingAddress.street && (
                    <div>{estimate.customer.billingAddress.street}</div>
                  )}
                  {(estimate.customer.billingAddress.city ||
                    estimate.customer.billingAddress.state ||
                    estimate.customer.billingAddress.zip) && (
                    <div>
                      {[
                        estimate.customer.billingAddress.city,
                        estimate.customer.billingAddress.state,
                        estimate.customer.billingAddress.zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {estimate.customer.billingAddress.country && (
                    <div>{estimate.customer.billingAddress.country}</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estimate Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  estimate.status === EstimateStatus.ACCEPTED
                    ? "bg-green-100 text-green-800"
                    : estimate.status === EstimateStatus.SENT
                    ? "bg-blue-100 text-blue-800"
                    : estimate.status === EstimateStatus.REJECTED
                    ? "bg-red-100 text-red-800"
                    : isExpired
                    ? "bg-gray-100 text-gray-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isExpired ? "EXPIRED" : estimate.status}
                {estimate.convertedToInvoice && " (Converted)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PO Number:</span>
              <span className="font-medium">{estimate.poNumber || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sales Rep:</span>
              <span className="font-medium">{estimate.salesRep || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(estimate.date).toLocaleDateString()}</span>
            </div>
            {estimate.expiryDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiry Date:</span>
                <span>{new Date(estimate.expiryDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${Number(estimate.total).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimate Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.description}</div>
                    {item.product && (
                      <div className="text-sm text-muted-foreground">
                        {item.product.sku && `SKU: ${item.product.sku}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.rate.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    ${item.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${Number(estimate.subtotal).toLocaleString()}</span>
              </div>
              {estimate.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${Number(estimate.tax).toLocaleString()}</span>
                </div>
              )}
              {estimate.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${Number(estimate.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${Number(estimate.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side Mark (Internal Only) */}
      {estimate.sideMark && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 dark:text-amber-300 flex items-center justify-between">
              <span>Side Mark (Internal / Warehouse)</span>
              <span className="text-xs font-normal text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                Hidden from printout quote & PDF
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap font-mono text-amber-950 dark:text-amber-100">{estimate.sideMark}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes and Terms */}
      {(estimate.notes || estimate.terms) && (
        <div className="grid gap-6 md:grid-cols-2">
          {estimate.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
              </CardContent>
            </Card>
          )}
          {estimate.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{estimate.terms}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
