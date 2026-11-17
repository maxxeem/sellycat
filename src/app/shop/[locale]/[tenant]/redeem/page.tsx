import { connection } from "next/server";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { getDictionary } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth/session";
import { getShopProfile } from "@/lib/shop/queries";
import { createClient } from "@/lib/supabase/server";
import { lightLogo } from "@/lib/vouchers/data";
import { findVoucher } from "@/lib/vouchers/redeem";
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
export default function RedeemPage({ params, searchParams }: PageProps<"/shop/[locale]/[tenant]/redeem">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Redeem params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Redeem({ params, searchParams }: Pick<PageProps<"/shop/[locale]/[tenant]/redeem">, "params" | "searchParams">) {
  const [{ tenant }, query] = await Promise.all([params, searchParams]);
  await connection();
  const shop = await getShopProfile(tenant);
  if (!shop) return null;
  const t = getDictionary(shop.locale);
  const user = await getSessionUser();
  const supabase = await createClient();
  const access = user ? (await supabase.rpc("can_use_redeem", { p_tenant: shop.id })).data === true : false;
  const token = typeof query.t === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(query.t) ? query.t : null;
  const initial = user && access && token ? await findVoucher(supabase, shop.id, { token }) : null;

  let recent: RecentRedemption[] = [];
  if (user && access) {
    const { data } = await supabase
      .from("redemptions")
      .select("id, amount_cents, created_at, undone_at, vouchers(code, title, orders(currency))")
      .eq("tenant_id", shop.id)
      .eq("user_id", user.id)
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
      <link rel="manifest" href="/redeem/manifest" />
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
          {user ? <SignOutButton label={t.redeem.signOut} /> : null}
        </header>

        {!user ? (
          <RedeemLogin shopName={shop.name} locale={shop.locale} />
        ) : !access ? (
          <div className="shop-card flex flex-col gap-3 p-6 text-center" data-testid="redeem-no-access">
            <p className="text-lg font-bold">{t.redeem.noAccessTitle}</p>
            <p>{t.redeem.errors.noAccess}</p>
            <p className="text-sm text-[var(--shop-muted)]">{user.email}</p>
          </div>
        ) : (
          <RedeemApp locale={shop.locale} email={user.email} initial={initial} recent={recent} />
        )}
      </div>
    </div>
  );
}
