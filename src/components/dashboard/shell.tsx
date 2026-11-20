import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentTenant, getMyTenants } from "@/lib/auth/tenants";
import { Skeleton } from "@/components/ui";
import { ShellFrame } from "./shell-frame";

export async function DashboardShell({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [tenants, current] = await Promise.all([getMyTenants(), getCurrentTenant()]);
  return (
    <ShellFrame
      user={{ name: user.name, email: user.email }}
      tenants={tenants.map((t) => ({ id: t.id, name: t.name }))}
      current={current ? { id: current.id, name: current.name, slug: current.slug, role: current.role } : null}
    >
      {children}
    </ShellFrame>
  );
}

export function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 border-r border-line bg-surface-2 p-4 lg:block">
        <Skeleton className="mb-6 h-10" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-8" />
        ))}
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
