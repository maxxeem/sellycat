"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";

export function Providers({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  // Light by default everywhere (site, help, dashboard, staff); dark only when chosen in the account menu or profile.
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} dictionary={dictionary}>
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
