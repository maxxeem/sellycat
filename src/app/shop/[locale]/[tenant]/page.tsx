import { Suspense } from "react";
import { CachedHome } from "./home";

/** Shop start page. */
export default function ShopIndex({ params }: PageProps<"/shop/[locale]/[tenant]">) {
  return (
    <Suspense fallback={null}>
      <Home tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function Home({ tenant }: { tenant: Promise<string> }) {
  return <CachedHome tenantId={await tenant} category={null} />;
}
