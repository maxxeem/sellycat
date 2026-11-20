import { Suspense, type ReactNode } from "react";
import { DashboardShellSkeleton } from "@/components/dashboard/shell";
import { ShellFrame } from "@/components/dashboard/shell-frame";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { onMfaPage, requireStaff } from "@/lib/platform/staff";

export const metadata = { title: "Admin" };

/** Staff admin (served at sellycat.com/admin; the proxy already 404s everyone who is not staff). */
export default async function StaffLayout({ children, params }: LayoutProps<"/p/[locale]/staff">) {
  const { t } = await fromParams(params);
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <StaffShell t={t}>{children}</StaffShell>
    </Suspense>
  );
}

async function StaffShell({ t, children }: { t: Dictionary; children: ReactNode }) {
  const staff = await requireStaff({ mfa: !(await onMfaPage()) });
  const nav = [
    { href: "/admin", label: t.staff.overview },
    { href: "/admin/tenants", label: t.staff.tenants },
    { href: "/admin/analytics", label: t.staff.analytics.nav },
    { href: "/admin/plans", label: t.staff.plansNav },
    { href: "/admin/requests", label: t.staff.requestsNav },
    { href: "/admin/settings", label: t.staff.settings },
    { href: "/admin/audit", label: t.staff.audit },
  ];
  return (
    <ShellFrame user={{ name: staff.name, email: staff.email }} tenants={[]} current={null} nav={nav} homeHref="/admin">
      {children}
    </ShellFrame>
  );
}
