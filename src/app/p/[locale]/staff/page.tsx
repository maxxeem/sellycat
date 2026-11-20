import Link from "next/link";
import { isSignupMode } from "@/lib/access/rules";
import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StaffHome({ params }: PageProps<"/p/[locale]/staff">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.title} />
      <Suspense fallback={<Skeleton className="h-28" />}>
        <Stats t={t} />
      </Suspense>
    </>
  );
}

async function Stats({ t }: { t: Dictionary }) {
  await requireStaff();
  const db = createAdminClient();
  const [tenants, settings, waiting] = await Promise.all([
    db.from("tenants").select("id", { count: "exact", head: true }),
    db.from("platform_settings").select("signup_mode").maybeSingle(),
    db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "new").not("confirmed_at", "is", null),
  ]);
  const mode = isSignupMode(settings.data?.signup_mode) ? settings.data.signup_mode : "paused";
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <Link href="/admin/tenants" className="block">
          <p className="text-sm text-muted">{t.staff.tenants}</p>
          <p className="mt-1 text-3xl font-bold">{tenants.count ?? 0}</p>
        </Link>
      </Card>
      <Card>
        <Link href="/admin/access" className="block">
          <p className="text-sm text-muted">{t.staff.access.modeTitle}</p>
          <p className="mt-1 text-3xl font-bold">{t.staff.access.modes[mode]}</p>
        </Link>
      </Card>
      <Card>
        <Link href="/admin/access/waitlist?status=new" className="block">
          <p className="text-sm text-muted">{t.staff.access.tabs.waitlist}: {t.staff.access.waitlist.statuses.new}</p>
          <p className="mt-1 text-3xl font-bold">{waiting.count ?? 0}</p>
        </Link>
      </Card>
    </div>
  );
}
