"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-context";
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

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navigation = [
    { key: "dashboard", name: t("nav.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { key: "customers", name: t("nav.customers"), href: "/dashboard/customers", icon: Users },
    { key: "vendors", name: t("nav.vendors"), href: "/dashboard/vendors", icon: Building2 },
    { key: "products", name: t("nav.products"), href: "/dashboard/products", icon: Package },
    { key: "invoices", name: t("nav.invoices"), href: "/dashboard/invoices", icon: FileText },
    { key: "estimates", name: t("nav.estimates"), href: "/dashboard/estimates", icon: Receipt },
    { key: "payments", name: t("nav.payments"), href: "/dashboard/payments", icon: CreditCard },
    { key: "expenses", name: t("nav.expenses"), href: "/dashboard/expenses", icon: Banknote },
    { key: "accounts", name: t("nav.accounts"), href: "/dashboard/accounts", icon: BookOpen },
    { key: "ledger", name: t("nav.ledger"), href: "/dashboard/ledger", icon: BookOpen },
    { key: "banking", name: t("nav.banking"), href: "/dashboard/banking", icon: Banknote },
    { key: "reports", name: t("nav.reports"), href: "/dashboard/reports", icon: BarChart3 },
    { key: "settings", name: t("nav.settings"), href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">VinBook</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
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



