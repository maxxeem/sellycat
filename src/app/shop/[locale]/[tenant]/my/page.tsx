import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { shopTexts } from "@/components/shop/shop-texts";
import { getShopProfile } from "@/lib/shop/queries";
import { MyForm } from "./my-form";

/** "My vouchers": ask for a sign-in link by mail. */
export default function MyPage({ params }: PageProps<"/shop/[locale]/[tenant]/my">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <My tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function My({ tenant }: { tenant: Promise<string> }) {
  const shop = await getShopProfile(await tenant);
  if (!shop) notFound();
  const t = shopTexts(shop.locale);
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <title>{`${t.myVouchers} · ${shop.name}`}</title>
      <meta name="robots" content="noindex" />
      <div className="shop-card flex flex-col gap-4 p-6 sm:p-8">
        <h1 className="shop-heading text-2xl font-bold">{t.myVouchers}</h1>
        <p className="text-[var(--shop-muted)]">{t.myIntro}</p>
        <MyForm tenantId={shop.id} t={t} />
      </div>
    </div>
  );
}
