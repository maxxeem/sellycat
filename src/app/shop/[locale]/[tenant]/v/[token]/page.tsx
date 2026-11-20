import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { shopTexts } from "@/components/shop/shop-texts";
import { VoucherCard } from "@/components/shop/voucher-card";
import { getShopProfile } from "@/lib/shop/queries";
import { createPublicClient } from "@/lib/supabase/admin";
import { checkUrl } from "@/lib/vouchers/symbol";
import { getSessionUser } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { VoucherActions } from "@/components/shop/wallet-buttons";
import { findVoucher } from "@/lib/vouchers/redeem";
import { ScannerRedeem } from "./scanner-redeem";
import { walletAvailable } from "@/lib/wallet/passes";
import { accessTarget, hasAccess } from "@/lib/vouchers/access";
import { VoucherGate } from "./voucher-gate";

export function generateStaticParams() {
  return [{ token: "placeholder" }];
}

/**
 * Voucher page (the QR code points here). Signed-in staff and partners of the shop get "slide to
 * redeem". Everyone else first sees a menu: "Scan voucher" (sign in with an email code) or "Show
 * voucher" (the owner confirms with a code sent to the order's address; the device is remembered
 * for 30 days). Only then are code, status and the wallet/PDF buttons shown.
 */
export default function VoucherPage({ params }: PageProps<"/shop/[locale]/[tenant]/v/[token]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Voucher params={params} />
    </Suspense>
  );
}

async function Voucher({ params }: { params: PageProps<"/shop/[locale]/[tenant]/v/[token]">["params"] }) {
  const { tenant, token } = await params;
  // Status changes with every redemption: always fresh.
  await connection();
  const shop = await getShopProfile(tenant);
  if (!shop) return null;
  const t = shopTexts(shop.locale);
  const { data } = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await createPublicClient().rpc("voucher_public", { p_token: token }) : { data: null };
  const v = data?.[0];
  const found = v && v.tenant_id === tenant;
  // A signed-in partner or team member of this shop sees "slide to redeem" instead of the buyer view.
  const user = found ? await getSessionUser() : null;
  const supabase = user ? await createClient() : null;
  const scanner = user && supabase ? (await supabase.rpc("can_use_redeem", { p_tenant: tenant })).data === true : false;
  const forScanner = scanner && supabase ? await findVoucher(supabase, tenant, { token }) : null;
  const d = getDictionary(shop.locale);
  const unlocked = found && !forScanner ? await hasAccess(tenant, token) : false;
  const ownerEmail = found && !forScanner && !unlocked ? await accessTarget(tenant, token) : null;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <title>{`${t.voucherCheckTitle} · ${shop.name}`}</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
      {found && forScanner && user ? (
        <ScannerRedeem voucher={forScanner} locale={shop.locale} email={user.email} />
      ) : found && !unlocked ? (
        <VoucherGate token={token} title={v.title} shopName={shop.name} locale={shop.locale} ownerEmail={ownerEmail ?? "•••"} notYours={scanner ? d.redeem.notYours : null} />
      ) : found ? (
        <div className="flex flex-col gap-4">
          <VoucherCard
            t={t}
            locale={shop.locale}
            currency={v.currency}
            v={{
              title: v.title,
              code: v.code,
              codeFormat: v.code_format,
              barcodeType: v.barcode_type,
              status: v.status,
              validUntil: v.valid_until,
              valueCents: v.value_cents,
              remainingCents: v.remaining_cents,
              partner: v.partner_name,
              link: checkUrl(shop.primaryHost ?? (await headers()).get("host") ?? "", token),
            }}
            actions={<VoucherActions token={token} t={d.wallet} available={walletAvailable()} status={v.status} />}
          />
          {v.deal_slug ? (
            <Link href={`/d/${v.deal_slug}`} className="text-center text-sm font-semibold underline underline-offset-2">
              {t.toDeal}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="shop-card p-6 text-center">
          <p className="font-semibold">{t.voucherNotFound}</p>
          <Link href="/" className="mt-4 inline-block underline">
            {t.backToShop}
          </Link>
        </div>
      )}
    </div>
  );
}
