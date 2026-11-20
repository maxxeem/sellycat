import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dayIn, periods, type DailyRow, type Period, type RangeDays } from "./metrics";

export type DealRow = { deal_id: string; title: string; slug: string | null; partner: string | null; views: number; qty: number; revenue_cents: number };
export type ShopAnalytics = { currency: string; period: Period; daily: DailyRow[]; previous: DailyRow[]; deals: DealRow[] };

type Raw = { daily?: DailyRow[]; deals?: DealRow[] };

/** Shop analytics for the last `days` days (RLS: the function checks the caller may see orders). */
export async function loadShopAnalytics(tenantId: string, days: RangeDays): Promise<ShopAnalytics> {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("timezone, currency").eq("id", tenantId).single();
  const { current, previous } = periods(dayIn(new Date(), tenant?.timezone ?? "Europe/Zurich"), days);
  const [now, before] = await Promise.all([
    supabase.rpc("tenant_analytics", { p_tenant: tenantId, p_from: current.from, p_to: current.to }),
    supabase.rpc("tenant_analytics", { p_tenant: tenantId, p_from: previous.from, p_to: previous.to }),
  ]);
  if (now.error) throw now.error;
  const a = (now.data ?? {}) as Raw;
  return {
    currency: tenant?.currency ?? "CHF",
    period: current,
    daily: a.daily ?? [],
    previous: ((before.data ?? {}) as Raw).daily ?? [],
    deals: a.deals ?? [],
  };
}

export type PlatformMoney = { currency: string; gmv_cents: number; fee_cents: number; orders: number };
export type PlatformAnalytics = {
  period: Period;
  daily: { day: string; signups: number; orders: number; views: number }[];
  money: PlatformMoney[];
  moneyDaily: { day: string; currency: string; gmv_cents: number; fee_cents: number }[];
  top: { id: string; name: string; slug: string; plan_id: string; currency: string; gmv_cents: number; fee_cents: number; orders: number }[];
  plans: { plan_id: string; tenants: number; paying: number }[];
  tenantsTotal: number;
  liveDeals: number;
};

/** Platform totals for staff (the function checks is_staff). Days in Zurich time. */
export async function loadPlatformAnalytics(days: RangeDays): Promise<PlatformAnalytics> {
  const supabase = await createClient();
  const { current } = periods(dayIn(new Date(), "Europe/Zurich"), days);
  const { data, error } = await supabase.rpc("platform_analytics", { p_from: current.from, p_to: current.to });
  if (error) throw error;
  const a = (data ?? {}) as Record<string, unknown>;
  return {
    period: current,
    daily: (a.daily as PlatformAnalytics["daily"]) ?? [],
    money: (a.money as PlatformMoney[]) ?? [],
    moneyDaily: (a.money_daily as PlatformAnalytics["moneyDaily"]) ?? [],
    top: (a.top as PlatformAnalytics["top"]) ?? [],
    plans: (a.plans as PlatformAnalytics["plans"]) ?? [],
    tenantsTotal: Number(a.tenants_total ?? 0),
    liveDeals: Number(a.live_deals ?? 0),
  };
}
