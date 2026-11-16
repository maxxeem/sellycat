import { Suspense } from "react";
import { DashboardShell, DashboardShellSkeleton } from "@/components/dashboard/shell";

/** The shell needs the session → it streams in behind Suspense (Cache Components). */
export default function DashboardLayout({ children }: LayoutProps<"/p/[locale]/dashboard">) {
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
