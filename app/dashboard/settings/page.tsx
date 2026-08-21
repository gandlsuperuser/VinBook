"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Building2, Upload, Trash2, Image as ImageIcon, Database, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, Table2, Layers } from "lucide-react";

interface OrganizationSettings {
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  taxId?: string;
}

interface Organization {
  id: string;
  name: string;
  settings: OrganizationSettings | null;
}

interface DatabaseUsage {
  usedBytes: number;
  usedMB: number;
  maxMB: number;
  percentage: number;
  status: "healthy" | "warning" | "critical";
  planLabel: string;
  tables: Array<{
    tableName: string;
    bytes: number;
    prettySize: string;
    rows: number;
  }>;
  counts: {
    invoices: number;
    customers: number;
    products: number;
    expenses: number;
    estimates: number;
    payments: number;
    ledgerEntries: number;
    inventoryLogs: number;
    bankAccounts: number;
  };
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dbUsage, setDbUsage] = useState<DatabaseUsage | null>(null);
  const [loadingDbUsage, setLoadingDbUsage] = useState(false);
  const [showDbDetails, setShowDbDetails] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    taxId: "",
  });

  useEffect(() => {
    fetchOrganization();
    fetchDbUsage();
  }, []);

  const fetchDbUsage = async () => {
    setLoadingDbUsage(true);
    try {
      const res = await fetch("/api/system/database-usage");
      if (res.ok) {
        const data = await res.json();
        setDbUsage(data);
      }
    } catch (e) {
      console.error("Error fetching db usage:", e);
    } finally {
      setLoadingDbUsage(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await fetch("/api/organization");
      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
        setFormData({
          name: data.name || "",
          logoUrl: data.settings?.logoUrl || "",
          email: data.settings?.email || "",
          phone: data.settings?.phone || "",
          street: data.settings?.address?.street || "",
          city: data.settings?.address?.city || "",
          state: data.settings?.address?.state || "",
          zip: data.settings?.address?.zip || "",
          country: data.settings?.address?.country || "",
          taxId: data.settings?.taxId || "",
        });
      } else {
        setError("Failed to load organization settings");
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      setError("Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const settings: OrganizationSettings = {
        logoUrl: formData.logoUrl || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: {
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
          country: formData.country || undefined,
        },
        taxId: formData.taxId || undefined,
      };

      // Remove undefined values from nested objects
      if (settings.address) {
        Object.keys(settings.address).forEach((key) => {
          if (settings.address![key as keyof typeof settings.address] === undefined) {
            delete settings.address![key as keyof typeof settings.address];
          }
        });
        if (Object.keys(settings.address).length === 0) {
          delete settings.address;
        }
      }

      const response = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          settings,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        fetchOrganization();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization information and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>
              This information will appear on invoices and other documents as the
              "From" company details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
                Settings saved successfully!
              </div>
            )}

            {/* Company Logo Section */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-center h-20 w-36 rounded-md border border-dashed bg-background overflow-hidden relative group">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Company Logo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-2">
                      <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                      <span>No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Logo
                    </Label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {formData.logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs h-7"
                        onClick={() => setFormData({ ...formData, logoUrl: "" })}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      id="logoUrl"
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, logoUrl: e.target.value })
                      }
                      placeholder="Or paste image URL (e.g. https://example.com/logo.png)"
                      className="text-xs h-8"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, SVG or GIF (max 2MB). This logo will appear on all invoices & quotes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Your Company Name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="company@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP/Postal Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder="Country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / Business Number</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value })
                }
                placeholder="Tax identification number"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Supabase Database Storage & Usage Card */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Supabase Database Storage Usage
                  {dbUsage && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        dbUsage.status === "healthy"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : dbUsage.status === "warning"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}
                    >
                      {dbUsage.status === "healthy"
                        ? "Healthy"
                        : dbUsage.status === "warning"
                        ? "Approaching Limit"
                        : "High Usage"}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Live storage allocation on Supabase PostgreSQL cloud database
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDbUsage}
              disabled={loadingDbUsage}
              className="cursor-pointer text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${
                  loadingDbUsage ? "animate-spin" : ""
                }`}
              />
              {loadingDbUsage ? "Checking..." : "Refresh Usage"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {dbUsage ? (
            <>
              {/* Storage Usage Progress Bar */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span>Database Disk Space</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground text-base">
                      {dbUsage.usedMB} MB
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {dbUsage.maxMB} MB ({dbUsage.percentage}% Used)
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="h-4 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dbUsage.percentage < 60
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : dbUsage.percentage < 80
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-gradient-to-r from-rose-500 to-red-600"
                    }`}
                    style={{ width: `${Math.max(1.5, Math.min(100, dbUsage.percentage))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0 MB</span>
                  <span className="font-medium text-foreground/80">{dbUsage.planLabel}</span>
                  <span>{dbUsage.maxMB} MB (Free Quota)</span>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-muted/30 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Invoices</div>
                  <div className="text-xl font-bold mt-1 text-foreground">
                    {dbUsage.counts.invoices}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Customers</div>
                  <div className="text-xl font-bold mt-1 text-foreground">
                    {dbUsage.counts.customers}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Catalog Products</div>
                  <div className="text-xl font-bold mt-1 text-foreground">
                    {dbUsage.counts.products}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Ledger Entries</div>
                  <div className="text-xl font-bold mt-1 text-foreground">
                    {dbUsage.counts.ledgerEntries}
                  </div>
                </div>
              </div>

              {/* Table Breakdown Accordion / Toggle */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowDbDetails(!showDbDetails)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Table2 className="h-3.5 w-3.5" />
                    {showDbDetails ? "Hide Table Breakdown" : "View Supabase PostgreSQL Table Sizes Breakdown"}
                  </span>
                  <span>{showDbDetails ? "▲ Hide" : "▼ Show (10 Tables)"}</span>
                </button>

                {showDbDetails && dbUsage.tables.length > 0 && (
                  <div className="mt-3 border rounded-lg overflow-hidden animate-in fade-in-0 duration-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                        <tr>
                          <th className="p-2">Table Name</th>
                          <th className="p-2 text-right">Estimated Rows</th>
                          <th className="p-2 text-right">Disk Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dbUsage.tables.map((t) => (
                          <tr key={t.tableName} className="hover:bg-muted/20">
                            <td className="p-2 font-mono font-medium text-foreground">
                              {t.tableName}
                            </td>
                            <td className="p-2 text-right text-muted-foreground">
                              {t.rows.toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-medium text-foreground">
                              {t.prettySize}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {loadingDbUsage ? "Loading Supabase database usage metrics..." : "Unable to load database metrics."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


