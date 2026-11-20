import { PageHeader } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { AccessTabs } from "./tabs";

export default async function AccessLayout({ children, params }: LayoutProps<"/p/[locale]/staff/access">) {
  const { t } = await fromParams(params);
  const a = t.staff.access;
  return (
    <>
      <PageHeader title={a.title} />
      <AccessTabs
        tabs={[
          { href: "/admin/access", label: a.modeTitle },
          { href: "/admin/access/codes", label: a.tabs.codes },
          { href: "/admin/access/waitlist", label: a.tabs.waitlist },
        ]}
      />
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </>
  );
}
