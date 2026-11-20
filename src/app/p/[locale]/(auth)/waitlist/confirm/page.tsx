import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { ConfirmForm } from "./confirm-form";

export const metadata = { title: "Waitlist", robots: { index: false } };

/** Double opt-in: a button (POST), so mail scanners that open links do not confirm by themselves. */
export default async function ConfirmPage({ params, searchParams }: PageProps<"/p/[locale]/waitlist/confirm">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell title={t.access.confirm.title}>
      <Suspense fallback={<Skeleton className="h-24" />}>
        <Token searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Token({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <ConfirmForm token={typeof q.token === "string" ? q.token : ""} />;
}
