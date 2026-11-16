import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { CachedHome } from "../../home";

export function generateStaticParams() {
  return [{ category: "placeholder" }];
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
  return <CachedHome tenantId={tenant} category={category} />;
}
