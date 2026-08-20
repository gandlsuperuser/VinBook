"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-context";
import { useLanguage } from "@/components/providers/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User, Settings, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { LanguageToggle } from "./language-toggle";

export function Header() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const userName = user?.name || "Vincent";
  const userEmail = user?.email || "Vin@123floorings.com";
  const userRole = user?.role || "ADMIN";

  const userInitials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "V";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
            VinBook Enterprise
          </span>
        </div>
      </div>

      {/* Top Actions: Language Toggle & User Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* English / Spanish Toggle */}
        <LanguageToggle />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold leading-none">{userName}</p>
                  <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {userRole}
                  </span>
                </div>
                <p className="text-xs leading-none text-muted-foreground pt-0.5">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                <span>{t("nav.profile")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>{t("nav.settings")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive flex items-center gap-2 cursor-pointer focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("nav.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
