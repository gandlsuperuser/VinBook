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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  CheckCircle2,
  Trash2,
  Pencil,
  Loader2,
  UserCheck,
  UserX,
  FileText,
  Package,
  Landmark,
  BarChart3,
  Settings,
  Eye,
  Lock,
} from "lucide-react";

export type RoleType = "ADMIN" | "ACCOUNTANT" | "SALES" | "WAREHOUSE" | "VIEWER";

export interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: RoleType;
  permissions?: Record<string, boolean> | null;
  isActive: boolean;
  image?: string | null;
  createdAt: string;
}

export const ROLE_INFO: Record<
  RoleType,
  { label: string; description: string; badgeClass: string; icon: any; defaultFunctions: string[] }
> = {
  ADMIN: {
    label: "Administrator",
    description: "Full access to all systems, financial ledger, team users, and organization settings.",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: ShieldAlert,
    defaultFunctions: [
      "Manage Invoices & Estimates",
      "Manage Inventory & Stock",
      "Banking & Payments",
      "General Ledger & Reports",
      "Manage Team & Settings",
    ],
  },
  ACCOUNTANT: {
    label: "Accountant / Finance",
    description: "Full access to invoices, expenses, banking, general ledger, and financial reports.",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Landmark,
    defaultFunctions: [
      "Manage Invoices & Estimates",
      "Record Expenses & Payments",
      "Banking & Reconciliations",
      "Financial Reports & P&L",
    ],
  },
  SALES: {
    label: "Sales Representative",
    description: "Create and send invoices, estimates, manage customer accounts, and packing lists.",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: FileText,
    defaultFunctions: [
      "Create & Send Invoices",
      "Create Estimates & Quotes",
      "Manage Customers",
      "View Product Catalog",
    ],
  },
  WAREHOUSE: {
    label: "Warehouse / Operations",
    description: "Manage product stock levels, inventory adjustments, and dispatch packing lists.",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: Package,
    defaultFunctions: [
      "Adjust & Track Inventory",
      "View Stock Movements",
      "Print Warehouse Packing Lists",
      "View Products Catalog",
    ],
  },
  VIEWER: {
    label: "Read-Only Viewer",
    description: "Read-only viewing of documents and summary metrics without editing privileges.",
    badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    icon: Eye,
    defaultFunctions: ["View Invoices & Estimates", "View Product Stock", "View General Reports"],
  },
};

export function TeamManagement() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create User Dialog
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES" as RoleType,
    canManageInvoices: true,
    canManageInventory: false,
    canAccessBanking: false,
    canViewReports: true,
    canManageSettings: false,
  });

  // Edit User Dialog
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "SALES" as RoleType,
    isActive: true,
    newPassword: "",
    canManageInvoices: true,
    canManageInventory: false,
    canAccessBanking: false,
    canViewReports: true,
    canManageSettings: false,
  });

  // Delete User Dialog
  const [deletingUser, setDeletingUser] = useState<TeamUser | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/organization/users");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load team users");
      }
      setUsers(data.users || []);
      setCurrentUserId(data.currentUserId || "");
    } catch (err: any) {
      console.error("Error fetching team users:", err);
      setError(err.message || "Failed to load team users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setAddForm({
      name: "",
      email: "",
      password: "",
      role: "SALES",
      canManageInvoices: true,
      canManageInventory: false,
      canAccessBanking: false,
      canViewReports: true,
      canManageSettings: false,
    });
    setIsAddModalOpen(true);
  };

  const handleRoleChangeForAdd = (role: RoleType) => {
    setAddForm((prev) => ({
      ...prev,
      role,
      canManageInvoices: role === "ADMIN" || role === "ACCOUNTANT" || role === "SALES",
      canManageInventory: role === "ADMIN" || role === "WAREHOUSE",
      canAccessBanking: role === "ADMIN" || role === "ACCOUNTANT",
      canViewReports: role === "ADMIN" || role === "ACCOUNTANT" || role === "SALES" || role === "VIEWER",
      canManageSettings: role === "ADMIN",
    }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/organization/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          password: addForm.password,
          role: addForm.role,
          permissions: {
            canManageInvoices: addForm.canManageInvoices,
            canManageInventory: addForm.canManageInventory,
            canAccessBanking: addForm.canAccessBanking,
            canViewReports: addForm.canViewReports,
            canManageSettings: addForm.canManageSettings,
          },
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccess(`User "${data.name || data.email}" successfully added to your team.`);
      setIsAddModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to add user");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (user: TeamUser) => {
    const perms = (user.permissions as any) || {};
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      role: user.role,
      isActive: user.isActive,
      newPassword: "",
      canManageInvoices: perms.canManageInvoices ?? (user.role === "ADMIN" || user.role === "ACCOUNTANT" || user.role === "SALES"),
      canManageInventory: perms.canManageInventory ?? (user.role === "ADMIN" || user.role === "WAREHOUSE"),
      canAccessBanking: perms.canAccessBanking ?? (user.role === "ADMIN" || user.role === "ACCOUNTANT"),
      canViewReports: perms.canViewReports ?? true,
      canManageSettings: perms.canManageSettings ?? (user.role === "ADMIN"),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    if (!editingUser) return;
    e.preventDefault();
    setSubmittingEdit(true);
    setError("");

    try {
      const res = await fetch(`/api/organization/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          role: editForm.role,
          isActive: editForm.isActive,
          password: editForm.newPassword || undefined,
          permissions: {
            canManageInvoices: editForm.canManageInvoices,
            canManageInventory: editForm.canManageInventory,
            canAccessBanking: editForm.canAccessBanking,
            canViewReports: editForm.canViewReports,
            canManageSettings: editForm.canManageSettings,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setSuccess(`User profile for "${data.name || data.email}" updated successfully.`);
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setSubmittingDelete(true);
    setError("");

    try {
      const res = await fetch(`/api/organization/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove user");
      }

      setSuccess(`User "${deletingUser.name || deletingUser.email}" removed from organization.`);
      setDeletingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to remove user");
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Team & User Roles</CardTitle>
              <CardDescription>
                Manage team members, assign functional roles, and control access permissions
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="gap-1.5 shadow-sm font-semibold cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add Team Member
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3 text-sm text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-xs hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Loading team accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No team members found. Click "Add Team Member" to invite your staff.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">User & Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned Functions</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const roleConfig = ROLE_INFO[u.role] || ROLE_INFO.VIEWER;
                  const isCurrent = u.id === currentUserId;
                  const RoleIcon = roleConfig.icon;

                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                            {(u.name || u.email).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                              {u.name || "User"}
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-1.5 py-0.2 rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${roleConfig.badgeClass}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {roleConfig.defaultFunctions.map((fn) => (
                            <span
                              key={fn}
                              className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border"
                            >
                              {fn}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border"
                          }`}
                        >
                          {u.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 px-2 text-xs gap-1 hover:bg-muted"
                            title="Edit Role & Permissions"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingUser(u)}
                              className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              title="Remove Team Member"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* ADD USER MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl p-6 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New Team Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create an account for your staff or accountant and configure their functional access permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-name" className="text-xs font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="add-name"
                  placeholder="e.g. Vincent Smith"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-email" className="text-xs font-semibold">
                  Email Address (Login ID) *
                </Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="user@123floorings.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-password" className="text-xs font-semibold">
                Initial Password * (min 6 characters)
              </Label>
              <Input
                id="add-password"
                type="password"
                placeholder="••••••••"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Primary Role & Responsibilities</Label>
              <Select value={addForm.role} onValueChange={(val: RoleType) => handleRoleChangeForAdd(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">👑 Administrator (Full System & Team Access)</SelectItem>
                  <SelectItem value="ACCOUNTANT">💼 Accountant (Finance, Banking & Ledger)</SelectItem>
                  <SelectItem value="SALES">🏷️ Sales Representative (Invoices & Estimates)</SelectItem>
                  <SelectItem value="WAREHOUSE">📦 Warehouse (Stock Adjustments & Packing Lists)</SelectItem>
                  <SelectItem value="VIEWER">👁️ Read-Only Viewer (Reports & Document Lookups)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {ROLE_INFO[addForm.role]?.description}
              </p>
            </div>

            {/* Custom Functional Permissions */}
            <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
              <div className="text-xs font-semibold text-foreground">Functional Feature Permissions</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.canManageInvoices}
                    onChange={(e) => setAddForm({ ...addForm, canManageInvoices: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Create & Send Invoices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.canManageInventory}
                    onChange={(e) => setAddForm({ ...addForm, canManageInventory: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Adjust & Track Inventory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.canAccessBanking}
                    onChange={(e) => setAddForm({ ...addForm, canAccessBanking: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Banking & Payments Access</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.canViewReports}
                    onChange={(e) => setAddForm({ ...addForm, canViewReports: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>View Analytics & Reports</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.canManageSettings}
                    onChange={(e) => setAddForm({ ...addForm, canManageSettings: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Organization & Team Admin</span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAdd} className="gap-1.5">
                {submittingAdd && <Loader2 className="h-4 w-4 animate-spin" />}
                Create User Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-xl p-6 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Team Member Role & Functions
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update role, functional permissions, or reset login password for{" "}
              <span className="font-semibold text-foreground">{editingUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold">
                  Full Name
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Status</Label>
                <Select
                  value={editForm.isActive ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(val) => setEditForm({ ...editForm, isActive: val === "ACTIVE" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">✅ Active Account</SelectItem>
                    <SelectItem value="INACTIVE">⛔ Inactive / Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">System Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(val: RoleType) =>
                  setEditForm((prev) => ({
                    ...prev,
                    role: val,
                    canManageInvoices: val === "ADMIN" || val === "ACCOUNTANT" || val === "SALES",
                    canManageInventory: val === "ADMIN" || val === "WAREHOUSE",
                    canAccessBanking: val === "ADMIN" || val === "ACCOUNTANT",
                    canViewReports: val !== "WAREHOUSE",
                    canManageSettings: val === "ADMIN",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">👑 Administrator (Full System & Team Access)</SelectItem>
                  <SelectItem value="ACCOUNTANT">💼 Accountant (Finance, Banking & Ledger)</SelectItem>
                  <SelectItem value="SALES">🏷️ Sales Representative (Invoices & Estimates)</SelectItem>
                  <SelectItem value="WAREHOUSE">📦 Warehouse (Stock Adjustments & Packing Lists)</SelectItem>
                  <SelectItem value="VIEWER">👁️ Read-Only Viewer (Reports & Document Lookups)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-password" className="text-xs font-semibold">
                Reset Password (leave blank to keep existing password)
              </Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Enter new password (optional)"
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                minLength={6}
              />
            </div>

            {/* Custom Functional Permissions */}
            <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
              <div className="text-xs font-semibold text-foreground">Functional Feature Permissions</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.canManageInvoices}
                    onChange={(e) => setEditForm({ ...editForm, canManageInvoices: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Create & Send Invoices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.canManageInventory}
                    onChange={(e) => setEditForm({ ...editForm, canManageInventory: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Adjust & Track Inventory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.canAccessBanking}
                    onChange={(e) => setEditForm({ ...editForm, canAccessBanking: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Banking & Payments Access</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.canViewReports}
                    onChange={(e) => setEditForm({ ...editForm, canViewReports: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>View Analytics & Reports</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.canManageSettings}
                    onChange={(e) => setEditForm({ ...editForm, canManageSettings: e.target.checked })}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Organization & Team Admin</span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingEdit} className="gap-1.5">
                {submittingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Remove Team Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove <span className="font-semibold text-foreground">{deletingUser?.name || deletingUser?.email}</span> ({deletingUser?.email}) from this account? They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={submittingDelete}
              className="gap-1.5"
            >
              {submittingDelete && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
