import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { LegalPage, legalMetadata } from "../legal";

export async function generateMetadata({ params }: PageProps<"/shop/[locale]/[tenant]/impressum">) {
  return legalMetadata((await params).tenant, "imprint");
}

export default function Page({ params }: PageProps<"/shop/[locale]/[tenant]/impressum">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Legal tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function Legal({ tenant }: { tenant: Promise<string> }) {
  return <LegalPage tenantId={await tenant} kind="imprint" />;
}
