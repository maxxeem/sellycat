"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";

export function Providers({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} dictionary={dictionary}>
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
