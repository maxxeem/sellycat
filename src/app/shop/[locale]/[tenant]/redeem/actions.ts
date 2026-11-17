"use server";

import { headers } from "next/headers";
import { getShopProfile } from "@/lib/shop/queries";
import { createClient } from "@/lib/supabase/server";
import { findVoucher, redeem, type VoucherError, type VoucherInfo } from "@/lib/vouchers/redeem";
import { sendRedeemCode, verifyRedeemCode } from "@/lib/vouchers/redeem-login";
import { parseScan } from "@/lib/vouchers/scan";
import { resolveShop } from "@/lib/site/resolve-shop";
import { classifyHost } from "@/lib/site/hosts";

/**
 * Redemption app on the shop domain. Every action works for the shop of the current host only
 * (never a tenant id from the browser) and as the signed-in user (rights checked in SQL).
 */
async function hostShop() {
  const h = await headers();
  const host = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  if (host.kind === "apex") return null;
  const resolved = await resolveShop(host);
  return resolved ? getShopProfile(resolved.id) : null;
}

export type LoginError = "login" | "code" | "tooMany" | "noAccess" | "failed";

/** Signed in and allowed to redeem in this shop? */
async function allowed(shopId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_use_redeem", { p_tenant: shopId });
  return { supabase, ok: data === true };
}

export async function passwordLogin(email: string, password: string): Promise<{ ok: true } | { ok: false; error: LoginError }> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: "login" };
  if (!(await allowed(shop.id)).ok) {
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, error: "noAccess" };
  }
  return { ok: true };
}

/** Always the same answer (no hint whether the address has access). */
export async function requestCode(email: string): Promise<{ ok: true }> {
  const shop = await hostShop();
  if (shop) await sendRedeemCode(shop, email).catch((e) => console.error("[redeem] code mail", e));
  return { ok: true };
}

export async function codeLogin(email: string, code: string): Promise<{ ok: true } | { ok: false; error: LoginError }> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "failed" };
  return verifyRedeemCode(shop.id, email, code);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
}

export type ScanResult = { ok: true; voucher: VoucherInfo } | { ok: false; error: VoucherError };

/** A scanned QR code (check link), barcode or typed code → the voucher. */
export async function lookup(input: string): Promise<ScanResult> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "not_found" };
  const { supabase, ok } = await allowed(shop.id);
  if (!ok) return { ok: false, error: "forbidden" };
  const scan = parseScan(input);
  if (scan.kind === "empty") return { ok: false, error: "not_found" };
  const voucher =
    scan.kind === "token"
      ? ((await findVoucher(supabase, shop.id, { token: scan.token })) ?? (await findVoucher(supabase, shop.id, { code: scan.token })))
      : await findVoucher(supabase, shop.id, { code: scan.code });
  return voucher ? { ok: true, voucher } : { ok: false, error: "not_found" };
}

export async function redeemNow(id: string, amount: string | null): Promise<{ ok: true; remaining: number | null } | { ok: false; error: VoucherError }> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "forbidden" };
  const { supabase, ok } = await allowed(shop.id);
  if (!ok) return { ok: false, error: "forbidden" };
  return redeem(supabase, id, amount, "pwa");
}
