import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { CachedHome, homeMetadata } from "../../home";
import { TrackShopView } from "../../track-shop-view";

export function generateStaticParams() {
  return [{ category: "placeholder" }];
}

export async function generateMetadata({ params }: PageProps<"/shop/[locale]/[tenant]/k/[category]">) {
  const { tenant, category } = await params;
  return homeMetadata(tenant, category);
}

/** One category of the shop (/k/<slug>): a separate, cacheable URL instead of a query string. */
export default function CategoryPage({ params }: PageProps<"/shop/[locale]/[tenant]/k/[category]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Category params={params} />
    </Suspense>
  );
}

async function Category({ params }: { params: PageProps<"/shop/[locale]/[tenant]/k/[category]">["params"] }) {
  const { tenant, category } = await params;
  return (
    <>
      <CachedHome tenantId={tenant} category={category} />
      <TrackShopView tenantId={tenant} />
    </>
  );
}
