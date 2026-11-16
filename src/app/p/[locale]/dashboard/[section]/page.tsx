import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { DASHBOARD_SECTIONS, isSection } from "@/lib/dashboard/nav";
import { fmt } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { LOCALES } from "@/lib/i18n/locales";

/** Placeholder for sections that arrive in later phases; each phase replaces its own folder. */
export function generateStaticParams() {
  return LOCALES.flatMap((locale) => DASHBOARD_SECTIONS.map((s) => ({ locale, section: s.key })));
}

export default async function SectionPage({ params }: PageProps<"/p/[locale]/dashboard/[section]">) {
  const { section } = await params;
  const { t } = await fromParams(params);
  if (!isSection(section)) notFound();
  const phase = DASHBOARD_SECTIONS.find((s) => s.key === section)!.phase;
  return (
    <>
      <PageHeader title={t.dashboard.nav[section]} />
      <EmptyState title={fmt(t.common.comingSoon, { phase })} />
    </>
  );
}
