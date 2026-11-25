"use server";

import { revalidatePath } from "next/cache";
import { kickDealAlerts, manualAlertMail, registerWakeUrl } from "@/lib/alerts/deal-alert";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { sendMail } from "@/lib/mail/mailgun";
import { createRateLimiter } from "@/lib/rate-limit";
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

export type ManualInput = { dealIds: string[]; subject: string; message: string };
export type ManualError = "deals" | "off" | "not_live" | "recent" | "recipients" | "limit" | "failed";

const clean = (i: ManualInput): ManualInput | null => {
  const dealIds = Array.isArray(i?.dealIds) ? [...new Set(i.dealIds.filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)))] : [];
  return dealIds.length >= 1 && dealIds.length <= 10 ? { dealIds, subject: String(i.subject ?? "").trim().slice(0, 120), message: String(i.message ?? "").trim().slice(0, 600) } : null;
};

/** How the mail of a manual alert looks (nothing is sent). */
export async function previewManualAlert(input: ManualInput): Promise<{ ok: true; subject: string; html: string } | { ok: false; error: ManualError }> {
  const { tenant } = await requireTenant("admin");
  const i = clean(input);
  if (!i) return { ok: false, error: "deals" };
  const r = await manualAlertMail(tenant.id, i.dealIds, i.subject, i.message);
  return r ? { ok: true, subject: r.mail.subject, html: r.mail.html } : { ok: false, error: "not_live" };
}

const testLimit = createRateLimiter({ limit: 10, windowMs: 3_600_000 });

/** The same mail to the signed-in person only. */
export async function testManualAlert(input: ManualInput): Promise<{ ok: true; email: string } | { ok: false; error: ManualError }> {
  const { tenant, user } = await requireTenant("admin");
  const i = clean(input);
  if (!i) return { ok: false, error: "deals" };
  if (!user.email || !testLimit.check(user.id).ok) return { ok: false, error: "limit" };
  const r = await manualAlertMail(tenant.id, i.dealIds, i.subject, i.message);
  if (!r) return { ok: false, error: "not_live" };
  const sent = await sendMail({ domain: r.sender.domain, from: r.sender.from, replyTo: r.sender.replyTo, to: user.email, ...r.mail, tag: "deal-alert-test" });
  return sent.ok ? { ok: true, email: user.email } : { ok: false, error: "failed" };
}

/** One or several live deals to all confirmed subscribers; the database checks and queues. */
export async function sendManualAlert(input: ManualInput): Promise<{ ok: true; recipients: number } | { ok: false; error: ManualError }> {
  const { tenant, user } = await requireTenant("admin");
  const i = clean(input);
  if (!i) return { ok: false, error: "deals" };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("deal_alert_manual", { p_tenant: tenant.id, p_deals: i.dealIds, p_subject: i.subject, p_message: i.message, p_user: user.id });
  const r = data as { ok: boolean; error?: ManualError; recipients?: number } | null;
  if (error || !r) return { ok: false, error: "failed" };
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  await admin.from("platform_audit_log").insert({ actor_id: user.id, action: "deal_alert.manual", tenant_id: tenant.id, target_type: "tenant", target_id: tenant.id, meta: { deals: i.dealIds, recipients: r.recipients } });
  kickDealAlerts();
  revalidatePath("/p/[locale]/dashboard/deal-alert", "page");
  return { ok: true, recipients: r.recipients ?? 0 };
}
