import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { Welcome } from "./welcome-step";

export const metadata = { title: "Welcome", robots: { index: false } };

/** After a Google sign-in without a shop: name the shop (and enter an invite code if needed). */
export default async function WelcomePage({ params, searchParams }: PageProps<"/p/[locale]/welcome">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell title={t.auth.welcomeTitle}>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Welcome searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
