"use client";

import { createContext, useContext } from "react";
import { getCopy, type AppLocale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (value: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  setLocale,
  children,
}: {
  locale: AppLocale;
  setLocale: (value: AppLocale) => void;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("useLocaleContext must be used inside LocaleProvider.");
  }

  return value;
}

export function useAppCopy() {
  const { locale } = useLocaleContext();
  return getCopy(locale);
}
