import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { CachedHome, homeMetadata } from "./home";
import { TrackShopView } from "./track-shop-view";

export async function generateMetadata({ params }: PageProps<"/shop/[locale]/[tenant]">) {
  return homeMetadata((await params).tenant, null);
}

/** Shop start page. */
export default function ShopIndex({ params }: PageProps<"/shop/[locale]/[tenant]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Home tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function Home({ tenant }: { tenant: Promise<string> }) {
  const id = await tenant;
  return (
    <>
      <CachedHome tenantId={id} category={null} />
      <TrackShopView tenantId={id} />
    </>
  );
}
