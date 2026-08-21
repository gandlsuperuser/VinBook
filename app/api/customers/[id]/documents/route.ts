import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";

const uploadDocumentSchema = z.object({
  type: z.enum(["w9", "permit", "other"]),
  name: z.string().min(1),
  fileData: z.string().min(1, "File data is required"), // Data URL / Base64 string
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

// POST - Upload / Attach document to customer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = uploadDocumentSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const docId = `doc_${Date.now()}`;
    const newDoc = {
      id: docId,
      type: validated.type,
      name: validated.name,
      url: validated.fileData,
      size: validated.fileSize || 0,
      mimeType: validated.mimeType || "application/pdf",
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.name || user.email,
    };

    let existingDocs: any[] = [];
    if (Array.isArray(customer.taxDocuments)) {
      existingDocs = customer.taxDocuments;
    } else if (typeof customer.taxDocuments === "string") {
      try {
        existingDocs = JSON.parse(customer.taxDocuments);
      } catch {
        existingDocs = [];
      }
    }

    // Filter out previous doc of same specific type if replacing
    const updatedDocs = existingDocs.filter((d) => d.type !== validated.type || validated.type === "other");
    updatedDocs.unshift(newDoc);

    const updateData: any = {
      taxDocuments: updatedDocs,
    };

    if (validated.type === "w9") {
      updateData.w9Url = validated.fileData;
    } else if (validated.type === "permit") {
      updateData.permitUrl = validated.fileData;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `${validated.type === "w9" ? "W-9 Form" : validated.type === "permit" ? "Sales Tax Permit" : "Document"} uploaded successfully`,
      document: newDoc,
      customer: updatedCustomer,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error uploading customer document:", error);
    return NextResponse.json({ error: "Failed to upload document", details: error?.message }, { status: 500 });
  }
}

// DELETE - Remove document by type or docId
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("type"); // "w9" | "permit"
    const docId = searchParams.get("docId");

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let existingDocs: any[] = [];
    if (Array.isArray(customer.taxDocuments)) {
      existingDocs = customer.taxDocuments;
    } else if (typeof customer.taxDocuments === "string") {
      try {
        existingDocs = JSON.parse(customer.taxDocuments);
      } catch {
        existingDocs = [];
      }
    }

    const filteredDocs = existingDocs.filter((d) => {
      if (docId && d.id === docId) return false;
      if (docType && d.type === docType) return false;
      return true;
    });

    const updateData: any = {
      taxDocuments: filteredDocs,
    };

    if (docType === "w9") {
      updateData.w9Url = null;
    } else if (docType === "permit") {
      updateData.permitUrl = null;
    }

    await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: "Document removed successfully" });
  } catch (error: any) {
    console.error("Error removing customer document:", error);
    return NextResponse.json({ error: "Failed to delete document", details: error?.message }, { status: 500 });
  }
}
