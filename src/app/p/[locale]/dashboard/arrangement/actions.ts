"use server";

import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { parseDealOrder, type DealOrder } from "@/lib/shop/deal-order";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deal order of the shop (editor and up): the mode, and for "manual" the positions of the deals
 * (10, 20, 30 … so a single deal can later slot in between).
 */
export async function saveDealOrder(mode: DealOrder, ids: string[] | null): Promise<{ ok: boolean }> {
  const { tenant, supabase } = await requireTenant("editor");
  const order = parseDealOrder(mode);
  const admin = createAdminClient();
  const { data: row } = await admin.from("tenants").select("shop_settings").eq("id", tenant.id).single();
  const settings = { ...((row?.shop_settings as Record<string, unknown>) ?? {}), deal_order: order };
  const { error } = await admin.from("tenants").update({ shop_settings: settings as never }).eq("id", tenant.id);
  if (error) return { ok: false };
  if (order === "manual" && ids) {
    const unique = [...new Set(ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)))].slice(0, 500);
    for (const [i, id] of unique.entries()) {
      const { error: e } = await supabase.from("deals").update({ sort_order: (i + 1) * 10 }).eq("id", id).eq("tenant_id", tenant.id);
      if (e) return { ok: false };
    }
  }
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/arrangement", "page");
  return { ok: true };
}
