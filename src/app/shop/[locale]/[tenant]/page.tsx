import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/locales";
import { createPublicClient } from "@/lib/supabase/admin";

// Cache Components needs one param to validate the route; real shops render on demand and are
// then cached per tenant (tag `shop:<id>`, refreshed when the shop changes).
export function generateStaticParams() {
  return [{ tenant: "00000000-0000-0000-0000-000000000000" }];
}

async function getShop(tenantId: string) {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("hours");
  if (!/^[0-9a-f-]{36}$/.test(tenantId) || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const { data } = await createPublicClient().rpc("shop_profile", { p_tenant: tenantId });
  return data?.[0] ?? null;
}

export async function generateMetadata({ params }: PageProps<"/shop/[locale]/[tenant]">): Promise<Metadata> {
  const shop = await getShop((await params).tenant);
  return { title: shop?.name ?? "Shop" };
}

/** Phase 1 placeholder: proves tenant resolution end to end. The real shop comes in phase 2. */
export default async function ShopHome({ params }: PageProps<"/shop/[locale]/[tenant]">) {
  return (
    <Suspense fallback={null}>
      <ShopPlaceholder params={params} />
    </Suspense>
  );
}

async function ShopPlaceholder({ params }: { params: PageProps<"/shop/[locale]/[tenant]">["params"] }) {
  const { locale, tenant } = await params;
  const shop = await getShop(tenant);
  if (!shop) notFound();
  const t = getDictionary(isLocale(locale) ? locale : "en");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-h2" data-testid="shop-name">
        {shop.name}
      </h1>
      <p className="text-muted">{t.common.comingSoon.replace("{phase}", "2")}</p>
    </main>
  );
}
