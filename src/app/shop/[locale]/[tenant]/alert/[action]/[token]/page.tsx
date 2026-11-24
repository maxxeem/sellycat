import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { shopTexts } from "@/components/shop/shop-texts";
import { getShopProfile } from "@/lib/shop/queries";
import { AlertAction } from "./alert-action";

/** Links from deal alert mails: /alert/confirm/<token> and /alert/off/<token>. */
export default function AlertPage({ params }: PageProps<"/shop/[locale]/[tenant]/alert/[action]/[token]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Alert params={params} />
    </Suspense>
  );
}

async function Alert({ params }: { params: PageProps<"/shop/[locale]/[tenant]/alert/[action]/[token]">["params"] }) {
  const { tenant, action, token } = await params;
  const shop = await getShopProfile(tenant);
  if (!shop || (action !== "confirm" && action !== "off")) notFound();
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <title>{`${shopTexts(shop.locale).dealAlert.title} · ${shop.name}`}</title>
      <meta name="robots" content="noindex" />
      <meta name="referrer" content="no-referrer" />
      <div className="shop-card flex flex-col items-start gap-4 p-6 sm:p-8">
        <AlertAction action={action} token={token} shop={shop.name} t={shopTexts(shop.locale)} />
      </div>
    </div>
  );
}
