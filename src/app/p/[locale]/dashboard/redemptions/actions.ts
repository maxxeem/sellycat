"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/dashboard/context";

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
const asError = (e: unknown): VoucherError => (ERRORS.has(e as VoucherError) ? (e as VoucherError) : "failed");

/** Finds a voucher of the current shop by its code (anyone who may redeem). */
export async function lookupVoucher(code: string): Promise<{ ok: true; voucher: VoucherInfo } | { ok: false; error: VoucherError }> {
  const { tenant, supabase } = await requireTenant("redeemer");
  const clean = code.trim().slice(0, 120);
  if (!clean) return { ok: false, error: "not_found" };
  const { data: id } = await supabase.rpc("find_voucher", { p_tenant: tenant.id, p_code: clean });
  if (!id) return { ok: false, error: "not_found" };
  const { data: v } = await supabase
    .from("vouchers")
    .select("id, code, title, status, partial, value_cents, remaining_cents, valid_until, orders(currency), partners(name)")
    .eq("id", id)
    .maybeSingle();
  if (!v) return { ok: false, error: "not_found" };
  const expired = v.status === "valid" && v.valid_until !== null && new Date(v.valid_until) <= new Date();
  return {
    ok: true,
    voucher: {
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
    },
  };
}

/** Redeems (fully, or `amount` francs of a partly usable value voucher). The database decides. */
export async function redeemVoucher(id: string, amount: string | null): Promise<{ ok: true; remaining: number | null } | { ok: false; error: VoucherError }> {
  const { supabase } = await requireTenant("redeemer");
  let cents: number | undefined;
  if (amount !== null && amount.trim() !== "") {
    cents = Math.round(Number(amount.replace(",", ".").replace(/[^\d.]/g, "")) * 100);
    if (!Number.isInteger(cents) || cents <= 0) return { ok: false, error: "amount" };
  }
  const { data, error } = await supabase.rpc("redeem_voucher", { p_voucher: id, p_amount: cents, p_source: "dashboard" });
  if (error || !data) return { ok: false, error: "failed" };
  const r = data as { ok: boolean; error?: string; remaining?: number | null };
  revalidatePath("/p/[locale]/dashboard/redemptions", "page");
  revalidatePath("/p/[locale]/dashboard/vouchers", "page");
  return r.ok ? { ok: true, remaining: r.remaining ?? null } : { ok: false, error: asError(r.error) };
}

/** Undoes a redemption (owner/admin, 7 days). */
export async function undoRedemption(id: string): Promise<{ ok: boolean; error?: VoucherError }> {
  const { supabase } = await requireTenant("admin");
  const { data, error } = await supabase.rpc("undo_redemption", { p_redemption: id });
  if (error || !data) return { ok: false, error: "failed" };
  const r = data as { ok: boolean; error?: string };
  revalidatePath("/p/[locale]/dashboard/redemptions", "page");
  revalidatePath("/p/[locale]/dashboard/vouchers", "page");
  return r.ok ? { ok: true } : { ok: false, error: asError(r.error) };
}

/** Takes an unused voucher out of circulation (owner/admin). */
export async function voidVoucher(id: string): Promise<{ ok: boolean; error?: VoucherError }> {
  const { supabase } = await requireTenant("admin");
  const { data, error } = await supabase.rpc("void_voucher", { p_voucher: id });
  if (error || !data) return { ok: false, error: "failed" };
  const r = data as { ok: boolean; error?: string };
  revalidatePath("/p/[locale]/dashboard/vouchers", "page");
  return r.ok ? { ok: true } : { ok: false, error: asError(r.error) };
}
