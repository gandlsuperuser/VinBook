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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Download, Check, DollarSign, Pencil, Trash2 } from "lucide-react";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { InvoiceForm } from "@/components/invoices/invoice-form";

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  organization: {
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
      id: string;
      name: string;
      sku: string | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
  }>;
  paidAmount: number;
  remainingAmount: number;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{
    id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
  } | null>(null);
  const [paymentData, setPaymentData] = useState<{
    amount: string;
    date: string;
    method: PaymentMethod;
    reference: string;
    notes: string;
  }>({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: PaymentMethod.CASH,
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        router.push("/dashboard/invoices");
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: InvoiceStatus) => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchInvoice();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/invoices/${params.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentData,
          amount: parseFloat(paymentData.amount),
        }),
      });

      if (response.ok) {
        setIsPaymentDialogOpen(false);
        setPaymentData({
          amount: "",
          date: new Date().toISOString().split("T")[0],
          method: PaymentMethod.CASH,
          reference: "",
          notes: "",
        });
        fetchInvoice();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment");
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchInvoice();
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment({
      id: payment.id,
      amount: Number(payment.amount),
      date: new Date(payment.date).toISOString().split("T")[0],
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
    });
    setIsEditPaymentDialogOpen(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      const response = await fetch(`/api/payments/${editingPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: editingPayment.amount,
          date: editingPayment.date,
          method: editingPayment.method,
          reference: editingPayment.reference || "",
          notes: editingPayment.notes || "",
        }),
      });

      if (response.ok) {
        setIsEditPaymentDialogOpen(false);
        setEditingPayment(null);
        fetchInvoice();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update payment");
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment");
    }
  };

  const handleDeleteInvoice = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/invoices");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete invoice");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    console.log("Starting PDF generation...");
    try {
      // Create a hidden container for PDF generation
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "fixed"; // Changed to fixed
      pdfContainer.style.left = "0"; // Keep on screen horizontally
      pdfContainer.style.top = "0";
      pdfContainer.style.zIndex = "-9999"; // Hide behind everything
      pdfContainer.style.width = "210mm"; // A4 width
      pdfContainer.style.padding = "20mm";
      pdfContainer.style.backgroundColor = "white";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "12px";
      pdfContainer.style.color = "black";
      document.body.appendChild(pdfContainer);

      console.log("PDF container created and appended.");

      // Build invoice HTML - Customer billing address
      const addressLines: string[] = [];
      if (invoice.customer.billingAddress) {
        const addr = invoice.customer.billingAddress;
        if (addr.street) {
          addressLines.push(addr.street);
        }
        const cityStateZip = [
          addr.city,
          addr.state,
          addr.zip,
        ]
          .filter(Boolean)
          .join(", ");
        if (cityStateZip) {
          addressLines.push(cityStateZip);
        }
        if (addr.country) {
          addressLines.push(addr.country);
        }
      }

      // Build organization address lines
      const orgAddressLines: string[] = [];
      if (invoice.organization.settings && typeof invoice.organization.settings === 'object') {
        const orgAddr = invoice.organization.settings.address;
        if (orgAddr) {
          if (orgAddr.street) {
            orgAddressLines.push(orgAddr.street);
          }
          const orgCityStateZip = [
            orgAddr.city,
            orgAddr.state,
            orgAddr.zip,
          ]
            .filter(Boolean)
            .join(", ");
          if (orgCityStateZip) {
            orgAddressLines.push(orgCityStateZip);
          }
          if (orgAddr.country) {
            orgAddressLines.push(orgAddr.country);
          }
        }
      }

      pdfContainer.innerHTML = `
        <div style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="flex: 1;">
              ${invoice.organization.settings?.logoUrl ? `<img src="${invoice.organization.settings.logoUrl}" style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 12px; display: block;" />` : ""}
              <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">INVOICE</h1>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 600; margin-bottom: 5px;">${invoice.organization.name}</div>
                ${invoice.organization.settings?.email ? `<div>${invoice.organization.settings.email}</div>` : ""}
                ${invoice.organization.settings?.phone ? `<div>${invoice.organization.settings.phone}</div>` : ""}
                ${orgAddressLines.map((line) => `<div>${line}</div>`).join("")}
              </div>
            </div>
            <div style="flex: 1; text-align: right;">
              <div style="margin-bottom: 10px;"><strong>Invoice #:</strong> ${invoice.number}</div>
              <div><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</div>
              <div><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Bill To:</h2>
          <div style="font-size: 14px; line-height: 1.6;">
            <div style="font-weight: 600; margin-bottom: 5px;">${invoice.customer.name}</div>
            ${invoice.customer.email ? `<div>${invoice.customer.email}</div>` : ""}
            ${addressLines.map((line) => `<div>${line}</div>`).join("")}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th style="text-align: left; padding: 10px 0; font-weight: bold;">Description</th>
              <th style="text-align: center; padding: 10px 0; font-weight: bold; width: 80px;">Qty</th>
              <th style="text-align: right; padding: 10px 0; font-weight: bold; width: 100px;">Rate</th>
              <th style="text-align: right; padding: 10px 0; font-weight: bold; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
          .map(
            (item) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px 0;">
                  <div style="font-weight: 500;">${item.description}</div>
                  ${item.product?.sku ? `<div style="font-size: 11px; color: #666;">SKU: ${item.product.sku}</div>` : ""}
                </td>
                <td style="text-align: center; padding: 10px 0;">${item.quantity}</td>
                <td style="text-align: right; padding: 10px 0;">$${Number(item.rate).toFixed(2)}</td>
                <td style="text-align: right; padding: 10px 0;">$${Number(item.amount).toFixed(2)}</td>
              </tr>
            `
          )
          .join("")}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 300px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Subtotal:</span>
            <span>$${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${invoice.tax > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Tax:</span><span>$${Number(invoice.tax).toFixed(2)}</span></div>` : ""}
          ${invoice.discount > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Discount:</span><span>-$${Number(invoice.discount).toFixed(2)}</span></div>` : ""}
          <div style="border-top: 2px solid #000; margin-top: 5px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
            <span>Total:</span>
            <span>$${Number(invoice.total).toFixed(2)}</span>
          </div>
          ${invoice.paidAmount > 0 ? `
            <div style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Paid:</span><span>$${invoice.paidAmount.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Remaining:</span><span>$${invoice.remainingAmount.toFixed(2)}</span></div>
            </div>
          ` : ""}
        </div>

        ${invoice.notes || invoice.terms ? `
          <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            ${invoice.notes ? `
              <div style="margin-bottom: 15px;">
                <h3 style="font-weight: bold; margin-bottom: 5px;">Notes:</h3>
                <div style="white-space: pre-wrap; font-size: 12px;">${invoice.notes}</div>
              </div>
            ` : ""}
            ${invoice.terms ? `
              <div>
                <h3 style="font-weight: bold; margin-bottom: 5px;">Terms & Conditions:</h3>
                <div style="white-space: pre-wrap; font-size: 12px;">${invoice.terms}</div>
              </div>
            ` : ""}
          </div>
        ` : ""}
      `;

      // Wait a bit for rendering
      await new Promise((resolve) => setTimeout(resolve, 500)); // Increased timeout

      console.log("Starting html2canvas capture...");

      try {
        // Capture as canvas
        const canvas = await html2canvas(pdfContainer, {
          scale: 1.5, // Reduced from 2 for smaller file size
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: pdfContainer.scrollWidth,
          windowHeight: pdfContainer.scrollHeight,
          onclone: (document) => {
            console.log("html2canvas cloned document");
          }
        });

        console.log("Canvas captured successfully.", canvas.width, canvas.height);

        // Remove the container
        document.body.removeChild(pdfContainer);

        // Create PDF
        console.log("Creating jsPDF instance...");
        // Use JPEG with quality 0.8 heavily reduces file size compared to PNG
        const imgData = canvas.toDataURL("image/jpeg", 0.8);
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        const imgPdfHeight = pdfWidth / ratio;
        let heightLeft = imgPdfHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgPdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
          heightLeft -= pdfHeight;
        }

        // Save PDF
        console.log("Saving PDF...");
        pdf.save(`Invoice-${invoice.number}.pdf`);
        console.log("PDF saved.");

      } catch (canvasError) {
        console.error("Error capturing canvas or saving PDF:", canvasError);
        document.body.removeChild(pdfContainer); // Clean up if capture fails
        throw new Error(`Failed to capture canvas: ${canvasError instanceof Error ? canvasError.message : String(canvasError)}`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const isOverdue =
    invoice.status !== InvoiceStatus.PAID &&
    new Date(invoice.dueDate) < new Date();

  // Convert invoice to form format for editing
  const invoiceForForm = invoice ? {
    id: invoice.id,
    customerId: invoice.customer.id,
    date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: invoice.status,
    items: invoice.items.map(item => ({
      id: item.id,
      productId: item.productId || undefined,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount) || 0,
    })),
    subtotal: Number(invoice.subtotal) || 0,
    tax: Number(invoice.tax) || 0,
    discount: Number(invoice.discount) || 0,
    total: Number(invoice.total) || 0,
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
    // Calculate taxRate from existing tax and subtotal
    taxRate: invoice.subtotal > 0 ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100 : 0,
  } : null;

  return (
    <div className="space-y-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice information
            </DialogDescription>
          </DialogHeader>
          {invoiceForForm && (
            <InvoiceForm
              invoice={invoiceForForm}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {invoice.number}
            </h1>
            <p className="text-muted-foreground">Invoice Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Invoice
          </Button>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Invoice
          </Button>
          {invoice.status === InvoiceStatus.DRAFT && (
            <Button
              onClick={() => handleStatusUpdate(InvoiceStatus.SENT)}
            >
              Mark as Sent
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
              {invoice.organization.settings?.logoUrl && (
                <img
                  src={invoice.organization.settings.logoUrl}
                  alt="Company Logo"
                  className="h-9 max-w-[120px] object-contain"
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{invoice.organization.name}</div>
              {invoice.organization.settings && typeof invoice.organization.settings === 'object' && (
                <>
                  {invoice.organization.settings.email && (
                    <div className="text-sm text-muted-foreground">
                      {invoice.organization.settings.email}
                    </div>
                  )}
                  {invoice.organization.settings.phone && (
                    <div className="text-sm text-muted-foreground">
                      {invoice.organization.settings.phone}
                    </div>
                  )}
                  {invoice.organization.settings.address && (
                    <div className="text-sm text-muted-foreground">
                      {invoice.organization.settings.address.street && (
                        <div>{invoice.organization.settings.address.street}</div>
                      )}
                      {(invoice.organization.settings.address.city ||
                        invoice.organization.settings.address.state ||
                        invoice.organization.settings.address.zip) && (
                          <div>
                            {[
                              invoice.organization.settings.address.city,
                              invoice.organization.settings.address.state,
                              invoice.organization.settings.address.zip,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      {invoice.organization.settings.address.country && (
                        <div>{invoice.organization.settings.address.country}</div>
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
              <div className="font-medium">{invoice.customer.name}</div>
              {invoice.customer.email && (
                <div className="text-sm text-muted-foreground">
                  {invoice.customer.email}
                </div>
              )}
              {invoice.customer.billingAddress && (
                <div className="text-sm text-muted-foreground">
                  {invoice.customer.billingAddress.street && (
                    <div>{invoice.customer.billingAddress.street}</div>
                  )}
                  {(invoice.customer.billingAddress.city ||
                    invoice.customer.billingAddress.state ||
                    invoice.customer.billingAddress.zip) && (
                      <div>
                        {[
                          invoice.customer.billingAddress.city,
                          invoice.customer.billingAddress.state,
                          invoice.customer.billingAddress.zip,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  {invoice.customer.billingAddress.country && (
                    <div>{invoice.customer.billingAddress.country}</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${invoice.status === InvoiceStatus.PAID
                  ? "bg-green-100 text-green-800"
                  : invoice.status === InvoiceStatus.SENT
                    ? "bg-blue-100 text-blue-800"
                    : isOverdue
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
              >
                {isOverdue && invoice.status !== InvoiceStatus.PAID
                  ? "OVERDUE"
                  : invoice.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${Number(invoice.total).toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="text-green-600">
                    ${invoice.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Remaining:</span>
                  <span>${invoice.remainingAmount.toLocaleString()}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
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
              {invoice.items.map((item) => (
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
                <span>${Number(invoice.subtotal).toLocaleString()}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${Number(invoice.tax).toLocaleString()}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${Number(invoice.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${Number(invoice.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.reference || "-"}</TableCell>
                    <TableCell className="text-right">
                      ${Number(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPayment(payment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Record Payment */}
      {invoice.remainingAmount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsPaymentDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Dialog
              open={isPaymentDialogOpen}
              onOpenChange={setIsPaymentDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment for this invoice
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={invoice.remainingAmount}
                        value={paymentData.amount}
                        onChange={(e) =>
                          setPaymentData({
                            ...paymentData,
                            amount: e.target.value,
                          })
                        }
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPaymentData({
                            ...paymentData,
                            amount: invoice.total.toString(),
                          })
                        }
                      >
                        Whole Amount
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Remaining: ${invoice.remainingAmount.toLocaleString()} | Total: ${invoice.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={paymentData.date}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          date: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method *</Label>
                    <Select
                      value={paymentData.method}
                      onValueChange={(value) =>
                        setPaymentData({
                          ...paymentData,
                          method: value as PaymentMethod,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                        <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                        <SelectItem value={PaymentMethod.CREDIT_CARD}>
                          Credit Card
                        </SelectItem>
                        <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value={PaymentMethod.PREPAID_CREDIT}>
                          Prepaid Credit
                        </SelectItem>
                        <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={paymentData.reference}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          reference: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Record Payment</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Edit Payment Dialog */}
      {editingPayment && (
        <Dialog
          open={isEditPaymentDialogOpen}
          onOpenChange={setIsEditPaymentDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>
                Update payment information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount *</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editingPayment.amount}
                    onChange={(e) =>
                      setEditingPayment({
                        ...editingPayment,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditingPayment({
                        ...editingPayment,
                        amount: invoice.total,
                      })
                    }
                  >
                    Whole Amount
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Invoice Total: ${invoice.total.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingPayment.date}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      date: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-method">Payment Method *</Label>
                <Select
                  value={editingPayment.method}
                  onValueChange={(value) =>
                    setEditingPayment({
                      ...editingPayment,
                      method: value as PaymentMethod,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                    <SelectItem value={PaymentMethod.CREDIT_CARD}>
                      Credit Card
                    </SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reference">Reference</Label>
                <Input
                  id="edit-reference"
                  value={editingPayment.reference || ""}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingPayment.notes || ""}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditPaymentDialogOpen(false);
                    setEditingPayment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Payment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Invoice Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice {invoice?.number}? This action cannot be undone.
              {invoice?.payments && invoice.payments.length > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  This invoice has {invoice.payments.length} payment(s). Please delete payments first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={isDeleting || (invoice?.payments && invoice.payments.length > 0)}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes and Terms */}
      {(invoice.notes || invoice.terms) && (
        <div className="grid gap-6 md:grid-cols-2">
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
          {invoice.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
