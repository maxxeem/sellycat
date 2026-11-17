import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { shopTexts } from "@/components/shop/shop-texts";
import { VoucherCard } from "@/components/shop/voucher-card";
import { WalletButtons } from "@/components/shop/wallet-buttons";
import { getDictionary } from "@/lib/i18n";
import { walletAvailable } from "@/lib/wallet/passes";
import { fmt } from "@/lib/i18n";
import { emailForLink } from "@/lib/mail/deliver";
import { getShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVouchers } from "@/lib/vouchers/data";

export function generateStaticParams() {
  return [{ token: "placeholder" }];
}

/** "My vouchers" behind a sign-in link: every voucher bought with or given to this address. */
export default function MyVouchersPage({ params }: PageProps<"/shop/[locale]/[tenant]/my/[token]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <MyVouchers params={params} />
    </Suspense>
  );
}

async function MyVouchers({ params }: Pick<PageProps<"/shop/[locale]/[tenant]/my/[token]">, "params">) {
  const { tenant, token } = await params;
  const shop = await getShopProfile(tenant);
  if (!shop) notFound();
  const t = shopTexts(shop.locale);
  const email = await emailForLink(tenant, token);
  const head = (
    <>
      <title>{`${t.myVouchers} · ${shop.name}`}</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
    </>
  );
  if (!email)
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        {head}
        <div className="shop-card flex flex-col gap-4 p-6 text-center sm:p-8">
          <p className="font-semibold">{t.myExpired}</p>
          <Link href="/my" className="shop-btn w-full">
            {t.myNewLink}
          </Link>
        </div>
      </div>
    );

  const admin = createAdminClient();
  const paid = ["paid", "partially_refunded", "refunded"] as const;
  const [{ data: bought }, { data: received }] = await Promise.all([
    admin.from("orders").select("id").eq("tenant_id", tenant).eq("email", email).in("status", paid).limit(200),
    admin.from("orders").select("id").eq("tenant_id", tenant).eq("gift_email", email).in("status", paid).not("gift_sent_at", "is", null).limit(200),
  ]);
  const ids = [...new Set([...(bought ?? []), ...(received ?? [])].map((o) => o.id))];
  const bundle = ids.length ? await loadVouchers(tenant, { orderIds: ids }, (await headers()).get("host") ?? "") : null;
  // Newest first; usable ones before used ones.
  const vouchers = [...(bundle?.vouchers ?? [])].reverse().sort((a, b) => Number(b.status === "valid") - Number(a.status === "valid"));

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      {head}
      <h1 className="shop-heading text-2xl font-bold">{t.myVouchers}</h1>
      <p className="mt-1 text-[var(--shop-muted)]">{fmt(t.myFor, { email })}</p>
      {vouchers.length ? (
        <div className="mt-6 flex flex-col gap-4">
          {vouchers.map((v) => (
            <div key={v.id} className="flex flex-col gap-2">
              <VoucherCard
                t={t}
                locale={shop.locale}
                currency={v.currency}
                linkLabel={t.voucherOpen}
                v={{ title: v.title, code: v.code, codeFormat: v.codeFormat, barcodeType: v.barcodeType, status: v.status, validUntil: v.validUntil, valueCents: v.valueCents, remainingCents: v.remainingCents, partner: v.partner, link: v.link }}
              />
              <WalletButtons token={v.token} t={getDictionary(shop.locale).wallet} available={walletAvailable()} status={v.status} compact />
              <a href={`/v/${v.token}/pdf`} target="_blank" rel="noopener" className="self-end text-sm font-semibold underline underline-offset-2">
                {t.downloadPdf}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="shop-card mt-6 p-6">{t.myEmpty}</p>
      )}
    </div>
  );
}
