"use client";

import { createContext, use, type ReactNode } from "react";
import type { Dictionary } from "./index";
import type { Locale } from "./locales";

const I18nContext = createContext<{ locale: Locale; t: Dictionary } | null>(null);

export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  return <I18nContext value={{ locale, t: dictionary }}>{children}</I18nContext>;
}

/** Dictionary and locale in client components (inside <I18nProvider>). */
export function useI18n() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Like useI18n, but null outside <I18nProvider> (the shops render without it). */
export function useOptionalI18n() {
  return use(I18nContext);
}
