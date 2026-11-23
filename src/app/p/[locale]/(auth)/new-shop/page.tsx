import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { Welcome } from "../welcome/welcome-step";

export const metadata = { title: "New shop", robots: { index: false } };

/** Another shop for a signed-in account (shop switcher «Create a new shop»); same rules as /welcome. */
export default async function NewShopPage({ params, searchParams }: PageProps<"/p/[locale]/new-shop">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell
      title={t.auth.newShopTitle}
      footer={
        <Link href="/dashboard" className="font-semibold text-accent-text underline">
          {t.auth.backToDashboard}
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Welcome searchParams={searchParams} additional />
      </Suspense>
    </AuthShell>
  );
}
