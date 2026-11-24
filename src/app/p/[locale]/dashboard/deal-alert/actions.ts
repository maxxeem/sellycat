"use server";

import { revalidatePath } from "next/cache";
import { registerWakeUrl } from "@/lib/alerts/deal-alert";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { createAdminClient } from "@/lib/supabase/admin";

/** Deal alert on/off (owner/admin; on only with the plan feature). Deals already live are never mailed. */
export async function setDealAlert(on: boolean): Promise<{ ok: boolean }> {
  const { tenant, user } = await requireTenant("admin");
  const admin = createAdminClient();
  if (on) {
    const { data: allowed } = await admin.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "deal_alert" });
    if (allowed !== true) return { ok: false };
  }
  const { error } = await admin.from("tenants").update({ deal_alert_at: on ? new Date().toISOString() : null }).eq("id", tenant.id);
  if (error) return { ok: false };
  if (on) await registerWakeUrl();
  await admin.from("platform_audit_log").insert({ actor_id: user.id, action: on ? "deal_alert.on" : "deal_alert.off", tenant_id: tenant.id, target_type: "tenant", target_id: tenant.id });
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deal-alert", "page");
  return { ok: true };
}

export async function removeSubscriber(id: string): Promise<{ ok: boolean }> {
  const { tenant } = await requireTenant("admin");
  const { error } = await createAdminClient().from("deal_alert_subscribers").delete().eq("id", id).eq("tenant_id", tenant.id);
  revalidatePath("/p/[locale]/dashboard/deal-alert", "page");
  return { ok: !error };
}
