import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Notice, Skeleton, linkClass } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { getSignupMode } from "@/lib/platform/settings";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { SignupForm } from "../forms";

export const metadata = { title: "Signup" };

export default async function SignupPage({ params }: PageProps<"/p/[locale]/signup">) {
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
        <SignupGate paused={<Notice>{`${t.auth.signupPausedTitle}. ${t.auth.signupPausedText}`}</Notice>} />
      </Suspense>
    </AuthShell>
  );
}

async function SignupGate({ paused }: { paused: React.ReactNode }) {
  if ((await getSignupMode()) !== "open") return <div data-testid="signup-paused">{paused}</div>;
  return <SignupForm root={(siteHost() || DEFAULT_ROOT).split(":")[0]} />;
}
