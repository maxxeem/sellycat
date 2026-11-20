import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FeeMonth = { month: string; currency: string; orders: number; amount_cents: number; refunded_cents: number; fee_cents: number };
export type FeeLine = { number: string; paid_at: string; currency: string; amount_cents: number; refunded_cents: number; fee_cents: number; net_fee_cents: number };

export const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Last 12 months with sales (owners and admins; the function checks). */
export async function feeMonths(tenantId: string): Promise<FeeMonth[]> {
  const db = await createClient();
  const { data, error } = await db.rpc("fee_months", { p_tenant: tenantId, p_months: 12 });
  if (error) throw error;
  return (data ?? []) as FeeMonth[];
}

/** Orders of one month (YYYY-MM) with gross and net fee. */
export async function feeLines(tenantId: string, month: string): Promise<FeeLine[]> {
  const db = await createClient();
  const { data, error } = await db.rpc("fee_lines", { p_tenant: tenantId, p_month: `${month}-01` });
  if (error) throw error;
  return (data ?? []) as FeeLine[];
}

export function monthName(month: string, locale: "de" | "en"): string {
  return new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
