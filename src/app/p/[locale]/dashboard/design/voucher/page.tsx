import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fromParams } from "@/lib/i18n/params";
import { designFromRow } from "@/lib/vouchers/design";
import { DesignTabs } from "../design-tabs";
import { VoucherDesignEditor } from "./voucher-design-editor";

export const metadata = { title: "Gutschein-PDF" };

export default async function VoucherDesignPage({ params }: PageProps<"/p/[locale]/dashboard/design/voucher">) {
  const { t } = await fromParams(params);
  return (
    <div className="flex flex-col gap-4">
      <DesignTabs active="voucher" t={t.voucherDesign} walletLabel={t.wallet.tabWallet} />
      <Suspense fallback={<Skeleton className="h-[80vh]" />}>
        <Editor />
      </Suspense>
    </div>
  );
}

async function Editor() {
  const { tenant, supabase } = await requireTenant("editor");
  const [{ data: row }, { data: theme }] = await Promise.all([
    supabase.from("voucher_designs").select("layout, size, accent, show_image, show_locations, show_terms, note, ad_enabled, ad_image").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("shop_themes").select("published, draft").eq("tenant_id", tenant.id).maybeSingle(),
  ]);
  const colors = ((theme?.published as { colors?: { primary?: string } } | null)?.colors ?? (theme?.draft as { colors?: { primary?: string } } | null)?.colors) ?? {};
  return <VoucherDesignEditor tenantId={tenant.id} initial={designFromRow(row)} shopColor={colors.primary ?? "#ff4b23"} />;
}
