"use client";

import { AuthProvider } from "./auth-context";
import { LanguageProvider } from "./language-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}
