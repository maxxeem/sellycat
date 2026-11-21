import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton, linkClass } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { LoginForm } from "../forms";
import { googleEnabled } from "@/lib/auth/providers";

export const metadata = { title: "Login" };

export default async function LoginPage({ params }: PageProps<"/p/[locale]/login">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell
      title={t.auth.loginTitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link href="/signup" className={linkClass}>
            {t.common.signup}
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-56" />}>
        <Login />
      </Suspense>
    </AuthShell>
  );
}

async function Login() {
  return <LoginForm google={await googleEnabled()} />;
}
