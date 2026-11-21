import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton, linkClass } from "@/components/ui";
import { checkCode, turnstileSiteKey } from "@/lib/access/server";
import { fromParams } from "@/lib/i18n/params";
import { getSignupMode } from "@/lib/platform/settings";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { SignupFlow } from "./signup-flow";
import { googleEnabled } from "@/lib/auth/providers";

export const metadata = { title: "Signup" };

export default async function SignupPage({ params, searchParams }: PageProps<"/p/[locale]/signup">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell
      title={t.auth.signupTitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link href="/login" className={linkClass}>
            {t.common.login}
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-72" />}>
        <SignupGate searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignupGate({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [mode, query, google] = await Promise.all([getSignupMode(), searchParams, googleEnabled()]);
  // A prefilled ?code= is checked on the server (rate-limited); an unusable one just shows the code step.
  const raw = typeof query.code === "string" ? query.code : "";
  const initial = raw ? await checkCode(raw) : null;
  return <SignupFlow mode={mode} root={(siteHost() || DEFAULT_ROOT).split(":")[0]} initialCode={initial?.ok ? initial.code : null} turnstileKey={turnstileSiteKey()} google={google} />;
}
