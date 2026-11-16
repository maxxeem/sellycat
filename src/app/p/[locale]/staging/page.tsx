import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { StagingForm } from "./form";

export default async function StagingPage({ params }: PageProps<"/p/[locale]/staging">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell title={t.staging.title}>
      <p className="mb-4 text-sm text-muted">{t.staging.text}</p>
      <Suspense fallback={<Skeleton className="h-24" />}>
        <StagingForm />
      </Suspense>
    </AuthShell>
  );
}
