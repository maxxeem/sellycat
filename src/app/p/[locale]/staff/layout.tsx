import { Suspense, type ReactNode } from "react";
import { DashboardShellSkeleton } from "@/components/dashboard/shell";
import { ShellFrame, type StaffIcon } from "@/components/dashboard/shell-frame";
import { getMyTenants } from "@/lib/auth/tenants";
import { I18nProvider } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { onMfaPage, requireStaff } from "@/lib/platform/staff";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Staff admin (served at sellycat.com/admin; the proxy already 404s everyone who is not staff). */
export default async function StaffLayout({ children, params }: LayoutProps<"/p/[locale]/staff">) {
  const { t, locale } = await fromParams(params);
  return (
    <I18nProvider locale={locale} dictionary={t}>
    <Suspense fallback={<DashboardShellSkeleton />}>
      <StaffShell t={t}>{children}</StaffShell>
    </Suspense>
    </I18nProvider>
  );
}

async function StaffShell({ t, children }: { t: Dictionary; children: ReactNode }) {
  const staff = await requireStaff({ mfa: !(await onMfaPage()) });
  const nav: Array<{ href: string; label: string; icon: StaffIcon }> = [
    { href: "/admin", label: t.staff.overview, icon: "home" },
    { href: "/admin/tenants", label: t.staff.tenants, icon: "tenants" },
    { href: "/admin/analytics", label: t.staff.analytics.nav, icon: "analytics" },
    { href: "/admin/plans", label: t.staff.plansNav, icon: "plans" },
    { href: "/admin/requests", label: t.staff.requestsNav, icon: "requests" },
    { href: "/admin/support", label: t.staff.support.nav, icon: "support" },
    { href: "/admin/help", label: t.staff.help.nav, icon: "help" },
    { href: "/admin/access", label: t.staff.access.nav, icon: "access" },
    { href: "/admin/audit", label: t.staff.audit, icon: "audit" },
  ];
  const tenants = await getMyTenants();
  return (
    <ShellFrame user={{ name: staff.name, email: staff.email }} tenants={tenants.map((x) => ({ id: x.id, name: x.name }))} current={null} nav={nav} homeHref="/admin" isStaff>
      {children}
    </ShellFrame>
  );
}
