"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Shield } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const isRegistered = searchParams.get("registered") === "true";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await login(email, password);

      if (!res.success) {
        setError(res.error || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      await refresh();
      // Hard navigation to ensure full session state
      window.location.href = callbackUrl;
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">VinBook</h1>
          <p className="text-sm text-muted-foreground">
            Commercial Accounting & Double-Entry Invoicing Platform
          </p>
        </div>

        <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your verified credentials to access your financial dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isRegistered && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Account created successfully. Please sign in below.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 animate-in fade-in-50">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full font-medium h-10 shadow-md shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Verifying credentials...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0 justify-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
