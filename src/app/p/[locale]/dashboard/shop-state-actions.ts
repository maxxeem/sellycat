"use server";

import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { parseNotice, type ShopState } from "@/lib/shop/shop-state";
import { createAdminClient } from "@/lib/supabase/admin";

/** Shop online / offline (owner and admins; the column is server-only). */
export async function setShopState(next: Exclude<ShopState, "building">): Promise<{ ok: boolean }> {
  if (next !== "online" && next !== "closed") return { ok: false };
  const { tenant, user } = await requireTenant("admin");
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ shop_state: next }).eq("id", tenant.id);
  if (error) return { ok: false };
  await admin.from("platform_audit_log").insert({ actor_id: user.id, action: `shop.${next}`, tenant_id: tenant.id, target_type: "tenant", target_id: tenant.id });
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard", "layout");
  return { ok: true };
}

/** Texts of the «new shop coming» and «closed» notes (empty = default text). */
export async function saveShopNotice(_: { ok?: boolean; error?: string } | null, form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { tenant } = await requireTenant("admin");
  const notice = parseNotice((k) => form.get(k));
  const { error } = await createAdminClient().from("tenants").update({ shop_notice: notice }).eq("id", tenant.id);
  if (error) return { error: error.message };
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/settings", "page");
  return { ok: true };
}
