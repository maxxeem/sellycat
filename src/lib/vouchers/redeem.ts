import "server-only";
import type { createClient } from "@/lib/supabase/server";

/**
 * Looking up and redeeming vouchers as the signed-in user (dashboard and the redemption app on
 * the shop domain). Rights are checked in SQL (find_voucher, redeem_voucher, RLS).
 */
type Client = Awaited<ReturnType<typeof createClient>>;

export type VoucherError = "not_found" | "forbidden" | "redeemed" | "expired" | "refunded" | "void" | "outside_window" | "amount" | "already_undone" | "too_late" | "valid" | "failed";

export type VoucherInfo = {
  id: string;
  code: string;
  title: string;
  status: "valid" | "redeemed" | "expired" | "refunded" | "void";
  partial: boolean;
  valueCents: number | null;
  remainingCents: number | null;
  validUntil: string | null;
  currency: string;
  partner: string | null;
};

const ERRORS = new Set<VoucherError>(["not_found", "forbidden", "redeemed", "expired", "refunded", "void", "outside_window", "amount", "already_undone", "too_late", "valid"]);
export const asVoucherError = (e: unknown): VoucherError => (ERRORS.has(e as VoucherError) ? (e as VoucherError) : "failed");

export async function voucherInfo(supabase: Client, id: string): Promise<VoucherInfo | null> {
  const { data: v } = await supabase
    .from("vouchers")
    .select("id, code, title, status, partial, value_cents, remaining_cents, valid_until, orders(currency), partners(name)")
    .eq("id", id)
    .maybeSingle();
  if (!v) return null;
  const expired = v.status === "valid" && v.valid_until !== null && new Date(v.valid_until) <= new Date();
  return {
    id: v.id,
    code: v.code,
    title: v.title,
    status: expired ? "expired" : v.status,
    partial: v.partial,
    valueCents: v.value_cents,
    remainingCents: v.remaining_cents,
    validUntil: v.valid_until,
    currency: v.orders?.currency ?? "CHF",
    partner: v.partners?.name ?? null,
  };
}

/** By code (spaces, dashes and case do not matter) or by the token of the check link. */
export async function findVoucher(supabase: Client, tenantId: string, by: { code: string } | { token: string }): Promise<VoucherInfo | null> {
  const { data: id } =
    "token" in by ? await supabase.rpc("find_voucher_by_token", { p_tenant: tenantId, p_token: by.token }) : await supabase.rpc("find_voucher", { p_tenant: tenantId, p_code: by.code.trim().slice(0, 120) });
  return id ? voucherInfo(supabase, id) : null;
}

/** Francs as typed ("12.50", "12,5") → cents; undefined = the whole remaining value. */
export function amountCents(amount: string | null): number | undefined | "invalid" {
  if (amount === null || amount.trim() === "") return undefined;
  const cents = Math.round(Number(amount.replace(",", ".").replace(/[^\d.]/g, "")) * 100);
  return Number.isInteger(cents) && cents > 0 ? cents : "invalid";
}

export async function redeem(
  supabase: Client,
  id: string,
  amount: string | null,
  source: "dashboard" | "pwa",
): Promise<{ ok: true; remaining: number | null } | { ok: false; error: VoucherError }> {
  const cents = amountCents(amount);
  if (cents === "invalid") return { ok: false, error: "amount" };
  const { data, error } = await supabase.rpc("redeem_voucher", { p_voucher: id, p_amount: cents, p_source: source });
  if (error || !data) return { ok: false, error: "failed" };
  const r = data as { ok: boolean; error?: string; remaining?: number | null };
  return r.ok ? { ok: true, remaining: r.remaining ?? null } : { ok: false, error: asVoucherError(r.error) };
}
