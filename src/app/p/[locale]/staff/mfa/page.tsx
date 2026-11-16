import { Card, PageHeader } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { MfaSetup } from "./mfa-setup";

/** Staff must confirm an authenticator code once per session (AAL2) before using the admin. */
export default async function MfaPage({ params }: PageProps<"/p/[locale]/staff/mfa">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.mfaTitle} />
      <Card className="max-w-md">
        <MfaSetup />
      </Card>
    </>
  );
}
