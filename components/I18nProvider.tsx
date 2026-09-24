"use client";

import { createContext, useContext, type ReactNode } from "react";
import { t as translate, type Locale, type MessageKey } from "@/lib/i18n";

const I18nContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext);
}

export function useT() {
  const locale = useLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
}
