import { Suspense } from "react";
import { shopTexts } from "@/components/shop/shop-texts";
import { getShopProfile } from "@/lib/shop/queries";

export function generateStaticParams() {
  return [{ slug: "placeholder" }];
}

/** Phase 2 placeholder: Stripe checkout arrives in phase 3. */
export default function CheckoutPage({ params }: PageProps<"/shop/[locale]/[tenant]/checkout/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Placeholder tenant={params.then((p) => p.tenant)} />
    </Suspense>
  );
}

async function Placeholder({ tenant }: { tenant: Promise<string> }) {
  const shop = await getShopProfile(await tenant);
  const t = shopTexts(shop?.locale ?? "de");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-lg font-semibold">{t.checkoutSoon}</p>
      <a href="/" className="mt-6 inline-block text-[var(--shop-primary)] underline">
        {t.backToShop}
      </a>
    </div>
  );
}
