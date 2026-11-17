"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sendMyLink } from "@/lib/mail/deliver";
import { createRateLimiter } from "@/lib/rate-limit";
import { getShopProfile } from "@/lib/shop/queries";
import { classifyHost } from "@/lib/site/hosts";
import { resolveShop } from "@/lib/site/resolve-shop";

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/** "My vouchers": mail a sign-in link. Same answer whether or not the address is known. */
export async function requestMyLink(tenantId: string, raw: string): Promise<{ ok: boolean; email?: string }> {
  const email = z.string().trim().toLowerCase().email().max(200).safeParse(raw);
  if (!email.success) return { ok: false };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!limiter.check(`${ip}:${tenantId}`).ok) return { ok: true, email: email.data };
  const host = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  const ref = host.kind === "apex" ? null : await resolveShop(host);
  const shop = ref?.id === tenantId ? await getShopProfile(tenantId) : null;
  if (shop) {
    try {
      await sendMyLink(shop, email.data);
    } catch (e) {
      console.error("[my] link:", e instanceof Error ? e.message : e);
    }
  }
  return { ok: true, email: email.data };
}
