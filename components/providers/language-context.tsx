"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations } from "@/lib/i18n/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  isSpanish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("vinbook_lang") as Language;
      if (savedLang === "en" || savedLang === "es") {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
      }
    } catch {
      // fallback
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("vinbook_lang", lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.error("Failed to save language:", e);
    }
  };

  const toggleLanguage = () => {
    const next = language === "en" ? "es" : "en";
    setLanguage(next);
  };

  const t = (key: string, fallback?: string): string => {
    const keys = key.split(".");
    let current: any = translations[language] || translations.en;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        // Fallback to English if missing in Spanish
        let enCurrent: any = translations.en;
        for (const ek of keys) {
          if (enCurrent && typeof enCurrent === "object" && ek in enCurrent) {
            enCurrent = enCurrent[ek];
          } else {
            return fallback || key;
          }
        }
        return typeof enCurrent === "string" ? enCurrent : fallback || key;
      }
    }

    return typeof current === "string" ? current : fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isSpanish: language === "es",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a safe default if outside provider
    return {
      language: "en" as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (k: string, fb?: string) => fb || k,
      isSpanish: false,
    };
  }
  return context;
}
