"use server";

import { headers } from "next/headers";
import { createRateLimiter } from "@/lib/rate-limit";
import { getShopProfile } from "@/lib/shop/queries";
import { classifyHost } from "@/lib/site/hosts";
import { resolveShop } from "@/lib/site/resolve-shop";
import { sendAccessCode, verifyAccessCode } from "@/lib/vouchers/access";

/** "Show voucher" with an email code. The shop always comes from the host, never from the browser. */

const tries = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });

async function context() {
  const h = await headers();
  const host = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (host.kind === "apex") return { shop: null, ip };
  const ref = await resolveShop(host);
  return { shop: ref ? await getShopProfile(ref.id) : null, ip };
}

export type AccessError = "code" | "tooMany" | "limit" | "not_found" | "failed";

export async function sendCode(token: string): Promise<{ ok: true; to: string } | { ok: false; error: AccessError }> {
  const { shop, ip } = await context();
  if (!shop) return { ok: false, error: "not_found" };
  if (!tries.check(ip).ok) return { ok: false, error: "limit" };
  return sendAccessCode(shop, token);
}

export async function checkCode(token: string, code: string): Promise<{ ok: true } | { ok: false; error: AccessError }> {
  const { shop, ip } = await context();
  if (!shop) return { ok: false, error: "not_found" };
  if (!tries.check(ip).ok) return { ok: false, error: "tooMany" };
  return verifyAccessCode(shop.id, token, code);
}
