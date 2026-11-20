import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui";
import { isSignupMode } from "@/lib/access/rules";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModeSwitch, ReminderForm } from "./mode-switch";

export default async function AccessPage({ params }: PageProps<"/p/[locale]/staff/access">) {
  const { t } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <Settings t={t} />
    </Suspense>
  );
}

async function Settings({ t }: { t: Dictionary }) {
  const staff = await requireStaff();
  const a = t.staff.access;
  const { data } = await createAdminClient().from("platform_settings").select("signup_mode, invite_reminder_days").maybeSingle();
  const canEdit = staff.role === "superadmin";
  return (
    <>
      <Card title={a.modeTitle} description={a.modeHint} className="max-w-2xl">
        <ModeSwitch mode={isSignupMode(data?.signup_mode) ? data.signup_mode : "paused"} canEdit={canEdit} />
      </Card>
      <Card title={a.reminderTitle} description={a.reminderHint} className="max-w-2xl">
        <ReminderForm days={data?.invite_reminder_days ?? 7} canEdit={canEdit} />
      </Card>
    </>
  );
}
