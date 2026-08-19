"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  FileText,
  Receipt,
  CreditCard,
  BookOpen,
  Banknote,
  TrendingUp,
  Settings,
  BarChart3,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Vendors", href: "/dashboard/vendors", icon: Building2 },
  { name: "Products & Inventory", href: "/dashboard/products", icon: Package },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Estimates", href: "/dashboard/estimates", icon: Receipt },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Expenses", href: "/dashboard/expenses", icon: Banknote },
  { name: "Chart of Accounts", href: "/dashboard/accounts", icon: BookOpen },
  { name: "General Ledger", href: "/dashboard/ledger", icon: BookOpen },
  { name: "Banking", href: "/dashboard/banking", icon: Banknote },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          <span className="text-lg font-bold">FastKeep</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}



