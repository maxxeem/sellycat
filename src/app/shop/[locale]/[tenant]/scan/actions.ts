"use server";

import { headers } from "next/headers";
import { getShopProfile } from "@/lib/shop/queries";
import { createClient } from "@/lib/supabase/server";
import type { VoucherError } from "@/lib/vouchers/redeem";
import { endScanSession, scanActor, type Lookup } from "@/lib/vouchers/scan-session";
import { sendRedeemCode, verifyRedeemCode } from "@/lib/vouchers/redeem-login";
import { parseScan } from "@/lib/vouchers/scan";
import { resolveShop } from "@/lib/site/resolve-shop";
import { classifyHost } from "@/lib/site/hosts";
import { networkOf, rateLimit } from "@/lib/access/server";
import { ownsAccountSession } from "@/lib/supabase/cookie-domain";
import { readCodesFromPhoto, readCodeConfigured } from "@/lib/vouchers/read-code-ai";

/**
 * Redemption app on the shop domain. Every action works for the shop of the current host only
 * (never a tenant id from the browser) and as the person signed in to the app (scan-session.ts; rights checked in SQL).
 */
async function hostShop() {
  const h = await headers();
  const host = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  if (host.kind === "apex") return null;
  const resolved = await resolveShop(host);
  return resolved ? getShopProfile(resolved.id) : null;
}

/** Per network and shop, across all instances (the per-code limit in SQL stays authoritative). */
async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type LoginError = "login" | "code" | "tooMany" | "noAccess" | "failed";

/** Always the same answer (no hint whether the address has access). */
export async function requestCode(email: string): Promise<{ ok: true }> {
  const shop = await hostShop();
  if (!shop || !(await rateLimit("scan-mail", `${shop.id}|${networkOf(await clientIp())}`, 30, 3600))) return { ok: true };
  await sendRedeemCode(shop, email).catch((e) => console.error("[redeem] code mail", e));
  return { ok: true };
}

export async function codeLogin(email: string, code: string): Promise<{ ok: true } | { ok: false; error: LoginError }> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "failed" };
  if (!(await rateLimit("scan-code", `${shop.id}|${networkOf(await clientIp())}`, 40, 600))) return { ok: false, error: "tooMany" };
  return verifyRedeemCode(shop.id, email, code);
}

export async function signOut(): Promise<void> {
  // Signed in with the app's own session: that one ends. Else the account session of a Sellycat host.
  if (await endScanSession()) return;
  const h = await headers();
  if (!ownsAccountSession(h.get("x-forwarded-host") ?? h.get("host"))) return;
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
}

export type ScanResult = Lookup;

/** A scanned QR code (check link), barcode or typed code → the voucher. */
export async function lookup(input: string): Promise<ScanResult> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "not_found" };
  const actor = await scanActor(shop.id);
  if (!actor) return { ok: false, error: "forbidden" };
  const scan = parseScan(input);
  if (scan.kind === "empty") return { ok: false, error: "not_found" };
  return actor.find(scan.kind === "token" ? { token: scan.token, code: scan.token } : { code: scan.code });
}

export type PhotoResult = ScanResult | { ok: false; error: "unreadable" | "unavailable" | "limit" };

/**
 * «Code abfotografieren»: the AI reads the codes in a camera still, each candidate is looked up
 * like a typed code. The first voucher found wins; else the most helpful error.
 */
export async function lookupPhoto(jpegBase64: string): Promise<PhotoResult> {
  const shop = await hostShop();
  if (!shop) return { ok: false, error: "not_found" };
  const actor = await scanActor(shop.id);
  if (!actor) return { ok: false, error: "forbidden" };
  if (!readCodeConfigured()) return { ok: false, error: "unavailable" };
  if (typeof jpegBase64 !== "string" || jpegBase64.length > 3_000_000 || !/^[A-Za-z0-9+/=]+$/.test(jpegBase64)) return { ok: false, error: "unreadable" };
  if (!(await rateLimit("scan-photo", actor.userId, 60, 600))) return { ok: false, error: "limit" };
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
  const actor = await scanActor(shop.id);
  if (!actor || typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "forbidden" };
  return actor.redeem(id, amount);
}
