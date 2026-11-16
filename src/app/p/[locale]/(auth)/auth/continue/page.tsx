import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { ContinueAuth } from "./continue-auth";

/** Landing page of every auth mail link (confirmation, invitation, password reset). */
export default async function ContinuePage({ params }: PageProps<"/p/[locale]/auth/continue">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell title={t.common.brand}>
      <Suspense fallback={<Skeleton className="h-10" />}>
        <ContinueAuth />
      </Suspense>
    </AuthShell>
  );
}
