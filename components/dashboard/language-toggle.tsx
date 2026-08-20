"use client";

import { useLanguage } from "@/components/providers/language-context";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border/80 bg-muted/50 p-0.5 text-xs shadow-2xs"
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
          language === "en"
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
        title="Switch to English"
      >
        <span className="text-sm leading-none">🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage("es")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
          language === "es"
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
        title="Cambiar a Español"
      >
        <span className="text-sm leading-none">🇲🇽</span>
        <span>ES</span>
      </button>
    </div>
  );
}

export function CompactLanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
      title={language === "en" ? "Cambiar a Español" : "Switch to English"}
    >
      <Globe className="h-3.5 w-3.5 text-primary" />
      <span>{language === "en" ? "🇺🇸 English" : "🇲🇽 Español"}</span>
    </button>
  );
}
