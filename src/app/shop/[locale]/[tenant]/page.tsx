import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { CachedHome } from "./home";
import { TrackShopView } from "./track-shop-view";

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
