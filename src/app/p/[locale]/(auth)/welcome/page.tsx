import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { codeRequired } from "@/lib/access/rules";
import { checkCode } from "@/lib/access/server";
import { fromParams } from "@/lib/i18n/params";
import { getSignupMode } from "@/lib/platform/settings";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { createClient } from "@/lib/supabase/server";
import { WelcomeForm } from "./welcome-form";

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

async function Welcome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/welcome");
  const [{ data: mine }, mode, query, { data: staff }] = await Promise.all([supabase.rpc("my_tenants"), getSignupMode(), searchParams, supabase.rpc("is_staff")]);
  if (mine && mine.length > 0) redirect("/dashboard");
  const raw = typeof query.code === "string" ? query.code : "";
  const initial = raw ? await checkCode(raw) : null;
  const name = typeof auth.user.user_metadata?.full_name === "string" ? auth.user.user_metadata.full_name : "";
  return (
    <WelcomeForm
      email={auth.user.email ?? ""}
      suggestedName={name}
      root={(siteHost() || DEFAULT_ROOT).split(":")[0]}
      needsCode={codeRequired(mode) && staff !== true}
      initialCode={initial?.ok ? initial.code : ""}
    />
  );
}
