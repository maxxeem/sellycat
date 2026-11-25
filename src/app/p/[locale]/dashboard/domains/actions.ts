"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/dashboard/context";
import { currentColumns } from "@/lib/mail/domain-check";
import { createSenderDomain, deleteSenderDomain, mailConfigured, platformMailDomain, verifySenderDomain } from "@/lib/mail/mailgun";
import { normaliseMailDomain } from "@/lib/mail/sender";
import { createAdminClient } from "@/lib/supabase/admin";

export type MailDomainError = "invalid" | "platform" | "exists" | "taken" | "plan" | "not_configured" | "mailgun" | "local" | "forbidden";
export type MailDomainResult = { ok: true } | { ok: false; error: MailDomainError };

const refresh = () => revalidatePath("/p/[locale]/dashboard/domains", "page");
const LOCAL = /^[a-z0-9._-]{1,40}$/;

/** Owner/admin enters a sender domain: Sellycat adds it at Mailgun and shows the DNS records. */
export async function addMailDomain(rawDomain: string, rawLocal: string): Promise<MailDomainResult> {
  const { tenant } = await requireTenant("admin");
  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "custom_mail_domain" });
  if (allowed !== true) return { ok: false, error: "plan" };
  if (!mailConfigured()) return { ok: false, error: "not_configured" };
  const domain = normaliseMailDomain(rawDomain);
  if (!domain) {
    console.warn(`[mail-domain] invalid input ${JSON.stringify(rawDomain)}`);
    return { ok: false, error: "invalid" };
  }
  if (domain === platformMailDomain()) return { ok: false, error: "platform" };
  const local = rawLocal.trim().toLowerCase() || "gutscheine";
  if (!LOCAL.test(local)) return { ok: false, error: "local" };
  const { data: existing } = await admin.from("mail_domains").select("tenant_id").eq("domain", domain).maybeSingle();
  if (existing) return { ok: false, error: existing.tenant_id === tenant.id ? "exists" : "taken" };
  const { data: mine } = await admin.from("mail_domains").select("domain").eq("tenant_id", tenant.id).maybeSingle();
  if (mine) {
    console.warn(`[mail-domain] ${tenant.id} already has ${mine.domain}`);
    return { ok: false, error: "exists" };
  }

  const state = await createSenderDomain(domain);
  if (!state.ok) {
    console.error(`[mail-domain] ${domain}:`, state.error);
    // Already in Sellycat's Mailgun account (another product or shop): never taken over.
    return { ok: false, error: state.status === 400 && /already|exist/i.test(state.error) ? "taken" : "mailgun" };
  }
  const { error } = await admin.from("mail_domains").insert({ tenant_id: tenant.id, domain, local_part: local, ...(await currentColumns(domain, state, false)) });
  if (error) {
    await deleteSenderDomain(domain);
    return { ok: false, error: "taken" };
  }
  refresh();
  return { ok: true };
}

/** Ask Mailgun to check the DNS again and store the result. */
export async function checkMailDomain(): Promise<MailDomainResult> {
  const { tenant } = await requireTenant("admin");
  const admin = createAdminClient();
  const { data: row } = await admin.from("mail_domains").select("domain, status").eq("tenant_id", tenant.id).maybeSingle();
  if (!row) return { ok: false, error: "invalid" };
  const state = await verifySenderDomain(row.domain);
  if (!state.ok) {
    await admin.from("mail_domains").update({ status: "error", error: state.error.slice(0, 300), last_checked_at: new Date().toISOString() }).eq("tenant_id", tenant.id);
    refresh();
    return { ok: false, error: "mailgun" };
  }
  await admin.from("mail_domains").update(await currentColumns(row.domain, state, row.status === "active")).eq("tenant_id", tenant.id);
  refresh();
  return { ok: true };
}

export async function saveLocalPart(rawLocal: string): Promise<MailDomainResult> {
  const { tenant } = await requireTenant("admin");
  const local = rawLocal.trim().toLowerCase();
  if (!LOCAL.test(local)) return { ok: false, error: "local" };
  await createAdminClient().from("mail_domains").update({ local_part: local }).eq("tenant_id", tenant.id);
  refresh();
  return { ok: true };
}

/** Back to Sellycat's domain; the domain is removed from Mailgun too. */
export async function removeMailDomain(): Promise<MailDomainResult> {
  const { tenant } = await requireTenant("admin");
  const admin = createAdminClient();
  const { data: row } = await admin.from("mail_domains").select("domain").eq("tenant_id", tenant.id).maybeSingle();
  if (!row) return { ok: true };
  await deleteSenderDomain(row.domain);
  await admin.from("mail_domains").delete().eq("tenant_id", tenant.id);
  refresh();
  return { ok: true };
}
