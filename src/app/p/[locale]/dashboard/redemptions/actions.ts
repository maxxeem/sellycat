"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { walletUpdate } from "@/lib/wallet/passes";
import { kickWebhooks } from "@/lib/developers/webhooks";
import { requireTenant } from "@/lib/dashboard/context";
import { asVoucherError as asError, findVoucher, redeem, type VoucherError, type VoucherInfo } from "@/lib/vouchers/redeem";

export type { VoucherError, VoucherInfo };

/** Finds a voucher of the current shop by its code (anyone who may redeem). */
export async function lookupVoucher(code: string): Promise<{ ok: true; voucher: VoucherInfo } | { ok: false; error: VoucherError }> {
  const { tenant, supabase } = await requireTenant("redeemer");
  if (!code.trim()) return { ok: false, error: "not_found" };
  const voucher = await findVoucher(supabase, tenant.id, { code });
  return voucher ? { ok: true, voucher } : { ok: false, error: "not_found" };
}

/** Redeems (fully, or `amount` francs of a partly usable value voucher). The database decides. */
export async function redeemVoucher(id: string, amount: string | null): Promise<{ ok: true; remaining: number | null } | { ok: false; error: VoucherError }> {
  const { supabase } = await requireTenant("redeemer");
  const r = await redeem(supabase, id, amount, "dashboard");
  revalidatePath("/p/[locale]/dashboard/redemptions", "page");
  revalidatePath("/p/[locale]/dashboard/vouchers", "page");
  return r;
}

/** Undoes a redemption (owner/admin, 7 days). */
export async function undoRedemption(id: string): Promise<{ ok: boolean; error?: VoucherError }> {
  const { tenant, supabase } = await requireTenant("admin");
  const { data, error } = await supabase.rpc("undo_redemption", { p_redemption: id });
  if (error || !data) return { ok: false, error: "failed" };
  const r = data as { ok: boolean; error?: string };
  if (r.ok) {
    const { data: red } = await supabase.from("redemptions").select("voucher_id").eq("id", id).maybeSingle();
    if (red) after(() => walletUpdate([red.voucher_id]));
    kickWebhooks(tenant.id);
  }
  revalidatePath("/p/[locale]/dashboard/redemptions", "page");
  revalidatePath("/p/[locale]/dashboard/vouchers", "page");
  return r.ok ? { ok: true } : { ok: false, error: asError(r.error) };
}

/** Takes an unused voucher out of circulation (owner/admin). */
export async function voidVoucher(id: string): Promise<{ ok: boolean; error?: VoucherError }> {
  const { tenant, supabase } = await requireTenant("admin");
  const { data, error } = await supabase.rpc("void_voucher", { p_voucher: id });
  if (error || !data) return { ok: false, error: "failed" };
  const r = data as { ok: boolean; error?: string };
  if (r.ok) {
    after(() => walletUpdate([id]));
    kickWebhooks(tenant.id);
  }
  revalidatePath("/p/[locale]/dashboard/vouchers", "page");
  return r.ok ? { ok: true } : { ok: false, error: asError(r.error) };
}
