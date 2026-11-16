import { AuthShell } from "@/components/auth-shell";
import { fromParams } from "@/lib/i18n/params";
import { ForgotForm } from "../forms";

export default async function ForgotPage({ params }: PageProps<"/p/[locale]/forgot">) {
  const { t } = await fromParams(params);
  return (
    <AuthShell title={t.auth.forgotTitle}>
      <ForgotForm />
    </AuthShell>
  );
}
