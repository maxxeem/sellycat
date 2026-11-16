import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { LegalPage } from "../legal";

export default function Page({ params }: PageProps<"/shop/[locale]/[tenant]/agb">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Legal tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function Legal({ tenant }: { tenant: Promise<string> }) {
  return <LegalPage tenantId={await tenant} kind="terms" />;
}
