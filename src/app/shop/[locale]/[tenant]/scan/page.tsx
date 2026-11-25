import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { getDictionary } from "@/lib/i18n";
import { getShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { lightLogo } from "@/lib/vouchers/data";
import { scanActor } from "@/lib/vouchers/scan-session";
import { RedeemApp, type RecentRedemption } from "./redeem-app";
import { RedeemLogin } from "./redeem-login";
import { SignOutButton } from "./sign-out-button";

export function generateStaticParams() {
  return [{ tenant: "00000000-0000-0000-0000-000000000000" }];
}

/**
 * Redemption app on the shop domain (installable): own sign-in on this host, then scan or type
 * a code and redeem. Covers the shop frame so it feels like an app.
 */
export default function RedeemPage({ params, searchParams }: PageProps<"/shop/[locale]/[tenant]/scan">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Redeem params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Redeem({ params, searchParams }: Pick<PageProps<"/shop/[locale]/[tenant]/scan">, "params" | "searchParams">) {
  const [{ tenant }, query] = await Promise.all([params, searchParams]);
  await connection();
  const shop = await getShopProfile(tenant);
  if (!shop) return null;
  const t = getDictionary(shop.locale);
  const actor = await scanActor(shop.id);
  // Signed in from a check page ("Partner? Zum Einlösen anmelden"): back to that voucher.
  const next = typeof query.next === "string" && /^\/v\/[A-Za-z0-9_-]{16,64}$/.test(query.next) ? query.next : null;
  if (actor && next) redirect(next);
  const token = typeof query.t === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(query.t) ? query.t : null;
  const found = actor && token ? await actor.find({ token }) : null;
  const initial = found?.ok ? found.voucher : null;

  let recent: RecentRedemption[] = [];
  if (actor) {
    // Service role: this person's own redemptions in this shop only.
    const { data } = await createAdminClient()
      .from("redemptions")
      .select("id, amount_cents, created_at, undone_at, vouchers(code, title, orders(currency))")
      .eq("tenant_id", shop.id)
      .eq("user_id", actor.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    recent = (data ?? []).map((r) => ({
      id: r.id,
      at: r.created_at,
      amountCents: r.amount_cents,
      undone: Boolean(r.undone_at),
      code: r.vouchers?.code ?? "",
      title: r.vouchers?.title ?? "",
      currency: r.vouchers?.orders?.currency ?? shop.currency,
    }));
  }

  const logo = lightLogo(shop);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--shop-bg)] text-[var(--shop-text)]">
      <title>{`${t.redeem.title} · ${shop.name}`}</title>
      <meta name="robots" content="noindex, nofollow" />
      <link rel="manifest" href="/scan/manifest" />
      <meta name="theme-color" content={shop.theme.colors.primary} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={t.redeem.title} />
      {shop.theme.favicon ? <link rel="apple-touch-icon" href={shop.theme.favicon} /> : null}
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-5 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt={shop.name} className="h-8 max-w-[9rem] object-contain" /> : <span className="truncate font-bold">{shop.name}</span>}
            <span className="rounded-full bg-[var(--shop-surface)] px-2.5 py-0.5 text-xs font-semibold">{t.redeem.title}</span>
          </span>
          {actor ? <SignOutButton label={t.redeem.signOut} /> : null}
        </header>

        {!actor ? (
          <RedeemLogin shopName={shop.name} texts={{ redeem: getDictionary(shop.locale).redeem }} />
        ) : (
          <RedeemApp texts={scanTexts(getDictionary(shop.locale))} locale={shop.locale} email={actor.email} initial={initial} recent={recent} />
        )}
      </div>
    </div>
  );
}

/** Only the texts the app shows (the full dictionary would be a large download). */
const scanTexts = (d: ReturnType<typeof getDictionary>) => ({ redeem: d.redeem, vouchers: d.vouchers, shop: d.shop });
