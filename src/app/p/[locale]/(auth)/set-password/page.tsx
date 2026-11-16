import { AuthShell } from "@/components/auth-shell";
import { fromParams } from "@/lib/i18n/params";
import { SetPasswordForm } from "../forms";

export default async function SetPasswordPage({ params }: PageProps<"/p/[locale]/set-password">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell title={t.auth.setPasswordTitle}>
      <SetPasswordForm />
    </AuthShell>
  );
}
