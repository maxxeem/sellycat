"use server";

import { createPublicClient } from "@/lib/supabase/admin";

/** One visit of the shop's start or category page. The database checks the shop is live. */
export async function trackShopView(tenantId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(tenantId)) return;
  await createPublicClient().rpc("track_shop_view", { p_tenant: tenantId });
}
