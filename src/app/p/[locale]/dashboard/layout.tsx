import { I18nProvider } from "@/lib/i18n/context";
import { fromParams } from "@/lib/i18n/params";
import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardShell, DashboardShellSkeleton } from "@/components/dashboard/shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The shell needs the session → it streams in behind Suspense (Cache Components). */
export default async function DashboardLayout({ children, params }: LayoutProps<"/p/[locale]/dashboard">) {
  const { t, locale } = await fromParams(params);
  return (
    <I18nProvider locale={locale} dictionary={t}>
    <Suspense fallback={<DashboardShellSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
    </I18nProvider>
  );
}
