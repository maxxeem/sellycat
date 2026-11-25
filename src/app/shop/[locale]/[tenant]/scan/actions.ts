"use server";

import { headers } from "next/headers";
import { getShopProfile } from "@/lib/shop/queries";
import { createClient } from "@/lib/supabase/server";
import { findVoucher, redeem, sharedCodeError, type VoucherError, type VoucherInfo } from "@/lib/vouchers/redeem";
import { sendRedeemCode, verifyRedeemCode } from "@/lib/vouchers/redeem-login";
import { parseScan } from "@/lib/vouchers/scan";
import { resolveShop } from "@/lib/site/resolve-shop";
import { classifyHost } from "@/lib/site/hosts";
import { createRateLimiter } from "@/lib/rate-limit";
import { readCodesFromPhoto, readCodeConfigured } from "@/lib/vouchers/read-code-ai";

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

/** Per instance and IP: blunts code-mail floods and guessing (the per-code limit in SQL stays authoritative). */
const codeMailLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
const codeTryLimit = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 });
async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type LoginError = "login" | "code" | "tooMany" | "noAccess" | "failed";

/** Signed in and allowed to redeem in this shop? */
async function allowed(shopId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_use_redeem", { p_tenant: shopId });
  return { supabase, ok: data === true };
}

/** Always the same answer (no hint whether the address has access). */
export async function requestCode(email: string): Promise<{ ok: true }> {
  const shop = await hostShop();
  if (!codeMailLimit.check(await clientIp()).ok) return { ok: true };
  if (shop) await sendRedeemCode(shop, email).catch((e) => console.error("[redeem] code mail", e));
  return { ok: true };
}

export async function codeLogin(email: string, code: string): Promise<{ ok: true } | { ok: false; error: LoginError }> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "failed" };
  if (!codeTryLimit.check(await clientIp()).ok) return { ok: false, error: "tooMany" };
  return verifyRedeemCode(shop.id, email, code);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
}

export type ScanResult = { ok: true; voucher: VoucherInfo } | { ok: false; error: VoucherError } | { ok: false; error: "other_partner"; partner: string };

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
  if (voucher) return { ok: true, voucher };
  const shared = await sharedCodeError(supabase, shop.id, scan.kind === "token" ? scan.token : scan.code);
  if (shared) return { ok: false, error: shared };
  // A voucher of this shop that belongs to another partner: say so instead of "not found".
  const { data: partner } = await supabase.rpc("voucher_partner_hint", {
    p_tenant: shop.id,
    p_code: scan.kind === "token" ? scan.token : scan.code,
    p_token: scan.kind === "token" ? scan.token : "",
  });
  return typeof partner === "string" ? { ok: false, error: "other_partner", partner } : { ok: false, error: "not_found" };
}

const photoLimit = createRateLimiter({ limit: 30, windowMs: 600_000 });

export type PhotoResult = ScanResult | { ok: false; error: "unreadable" | "unavailable" | "limit" };

/**
 * «Code abfotografieren»: the AI reads the codes in a camera still, each candidate is looked up
 * like a typed code. The first voucher found wins; else the most helpful error.
 */
export async function lookupPhoto(jpegBase64: string): Promise<PhotoResult> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "not_found" };
  const { supabase, ok } = await allowed(shop.id);
  if (!ok) return { ok: false, error: "forbidden" };
  if (!readCodeConfigured()) return { ok: false, error: "unavailable" };
  if (typeof jpegBase64 !== "string" || jpegBase64.length > 3_000_000 || !/^[A-Za-z0-9+/=]+$/.test(jpegBase64)) return { ok: false, error: "unreadable" };
  const { data: user } = await supabase.auth.getUser();
  if (!photoLimit.check(user.user?.id ?? shop.id).ok) return { ok: false, error: "limit" };
  const codes = await readCodesFromPhoto(jpegBase64);
  if (codes === null) return { ok: false, error: "unavailable" };
  if (!codes.length) return { ok: false, error: "unreadable" };
  let best: ScanResult | null = null;
  for (const code of codes) {
    const r = await lookup(code);
    if (r.ok) return r;
    if (!best || (best.error === "not_found" && r.error !== "not_found")) best = r;
  }
  return best ?? { ok: false, error: "not_found" };
}

export async function redeemNow(id: string, amount: string | null): Promise<{ ok: true; remaining: number | null } | { ok: false; error: VoucherError }> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "forbidden" };
  const { supabase, ok } = await allowed(shop.id);
  if (!ok) return { ok: false, error: "forbidden" };
  return redeem(supabase, id, amount, "pwa");
}
