"use server";

import { createPublicClient } from "@/lib/supabase/admin";

/** One view of a deal page (for "most popular" in the shop). The database checks the deal is live. */
export async function trackView(dealId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(dealId)) return;
  await createPublicClient().rpc("track_deal_view", { p_deal: dealId });
}
