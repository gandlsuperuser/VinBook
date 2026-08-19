import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";

const organizationUpdateSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  settings: z
    .object({
      logoUrl: z.string().optional().or(z.literal("")),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional().or(z.literal("")),
      address: z
        .object({
          street: z.string().optional().or(z.literal("")),
          city: z.string().optional().or(z.literal("")),
          state: z.string().optional().or(z.literal("")),
          zip: z.string().optional().or(z.literal("")),
          country: z.string().optional().or(z.literal("")),
        })
        .optional(),
      taxId: z.string().optional().or(z.literal("")),
    })
    .optional(),
});

// GET - Get organization
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PATCH - Update organization
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.error("No user found in organization PATCH request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Updating organization for organizationId:", user.organizationId);

    const body = await request.json();
    const validatedData = organizationUpdateSchema.parse(body);

    // First, get the existing organization to preserve existing settings
    const existingOrg = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        settings: true,
      },
    });

    // Merge existing settings with new settings
    let existingSettings: any = existingOrg?.settings || {};
    if (typeof existingSettings === 'string') {
      try {
        existingSettings = JSON.parse(existingSettings);
      } catch {
        existingSettings = {};
      }
    }

    // Clean up empty strings in the new settings
    let cleanedSettings = validatedData.settings;
    if (cleanedSettings) {
      if (cleanedSettings.logoUrl === "") {
        delete existingSettings.logoUrl;
      } else if (cleanedSettings.logoUrl !== undefined) {
        existingSettings.logoUrl = cleanedSettings.logoUrl;
      }

      if (cleanedSettings.email === "") {
        delete cleanedSettings.email;
      } else if (cleanedSettings.email !== undefined) {
        existingSettings.email = cleanedSettings.email;
      }

      if (cleanedSettings.phone === "") {
        delete cleanedSettings.phone;
      } else if (cleanedSettings.phone !== undefined) {
        existingSettings.phone = cleanedSettings.phone;
      }

      if (cleanedSettings.taxId === "") {
        delete cleanedSettings.taxId;
      } else if (cleanedSettings.taxId !== undefined) {
        existingSettings.taxId = cleanedSettings.taxId;
      }

      if (cleanedSettings.address) {
        // Initialize address if it doesn't exist
        if (!existingSettings.address) {
          existingSettings.address = {};
        }

        // Merge address fields
        Object.keys(cleanedSettings.address).forEach((key) => {
          const value =
            cleanedSettings.address![
              key as keyof typeof cleanedSettings.address
            ];
          if (value === "") {
            // Remove field if empty string
            delete existingSettings.address[key as keyof typeof existingSettings.address];
          } else if (value !== undefined) {
            // Update field if provided
            existingSettings.address[key as keyof typeof existingSettings.address] = value;
          }
        });

        // If address object is empty, remove it
        if (Object.keys(existingSettings.address).length === 0) {
          delete existingSettings.address;
        }
      }
    }

    // Only update settings if we have something to save
    const finalSettings = Object.keys(existingSettings).length > 0 ? existingSettings : null;

    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: validatedData.name,
        settings: finalSettings,
      },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

