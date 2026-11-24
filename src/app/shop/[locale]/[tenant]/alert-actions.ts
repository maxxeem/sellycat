"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { alertOffered, confirm, subscribe, unsubscribe } from "@/lib/alerts/deal-alert";
import { getShopProfile } from "@/lib/shop/queries";
import { classifyHost } from "@/lib/site/hosts";
import { resolveShop } from "@/lib/site/resolve-shop";

/** The shop always comes from the host, never from the browser. */
async function hostShop() {
  const h = await headers();
  const host = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  const ref = host.kind === "apex" ? null : await resolveShop(host);
  return ref ? getShopProfile(ref.id) : null;
}

export async function subscribeDealAlert(raw: string): Promise<"ok" | "email" | "limit" | "failed"> {
  const email = z.string().trim().toLowerCase().email().max(200).safeParse(raw);
  if (!email.success) return "email";
  const shop = await hostShop();
  if (!shop || !alertOffered(shop)) return "failed";
  try {
    return await subscribe(shop, email.data);
  } catch (e) {
    console.error("[deal-alert] subscribe", e instanceof Error ? e.message : e);
    return "failed";
  }
}

export async function confirmDealAlert(token: string): Promise<boolean> {
  const shop = await hostShop();
  return shop ? confirm(shop.id, String(token)) : false;
}

export async function stopDealAlert(token: string): Promise<boolean> {
  await unsubscribe(String(token));
  return true;
}
