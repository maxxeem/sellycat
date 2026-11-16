import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignupSwitch } from "./signup-switch";

export default async function SettingsPage({ params }: PageProps<"/p/[locale]/staff/settings">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.settings} />
      <Suspense fallback={<Skeleton className="h-32" />}>
        <Settings t={t} />
      </Suspense>
    </>
  );
}

async function Settings({ t }: { t: Dictionary }) {
  const staff = await requireStaff();
  const { data } = await createAdminClient().from("platform_settings").select("signup_mode").maybeSingle();
  return (
    <Card title={t.staff.signupMode} description={t.staff.signupHint} className="max-w-xl">
      <SignupSwitch mode={data?.signup_mode === "open" ? "open" : "paused"} canEdit={staff.role === "superadmin"} />
    </Card>
  );
}
