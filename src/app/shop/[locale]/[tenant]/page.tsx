import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { CachedHome } from "./home";

/** Shop start page. */
export default function ShopIndex({ params }: PageProps<"/shop/[locale]/[tenant]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Home tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function Home({ tenant }: { tenant: Promise<string> }) {
  return <CachedHome tenantId={await tenant} category={null} />;
}
