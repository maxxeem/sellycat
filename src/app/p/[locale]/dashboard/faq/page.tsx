import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fromParams } from "@/lib/i18n/params";
import { FaqManager } from "./faq-manager";

export const metadata = { title: "FAQ" };

export default async function FaqPage({ params }: PageProps<"/p/[locale]/dashboard/faq">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.faqLibrary.title} description={t.faqLibrary.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Entries />
      </Suspense>
    </>
  );
}

async function Entries() {
  const { tenant, supabase } = await requireTenant("editor");
  const { data } = await supabase.from("faq_library").select("id, question, answer").eq("tenant_id", tenant.id).order("created_at");
  return <FaqManager entries={(data ?? []).map((e) => ({ id: e.id, q: e.question, a: e.answer }))} />;
}
