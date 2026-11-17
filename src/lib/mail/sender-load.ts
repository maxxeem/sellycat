import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { platformMailDomain } from "./mailgun";
import { buildSender, type Sender } from "./sender";

/** The sender of a shop right now (own domain only while verified and allowed by the plan). */
export async function loadSender(tenantId: string): Promise<Sender & { shopName: string; locale: "de" | "en" }> {
  const admin = createAdminClient();
  const [{ data: t }, { data: own }, { data: allows }] = await Promise.all([
    admin.from("tenants").select("name, locale, mail_from_name, reply_to, shop_settings").eq("id", tenantId).single(),
    admin.from("mail_domains").select("domain, local_part, status").eq("tenant_id", tenantId).maybeSingle(),
    admin.rpc("plan_allows", { p_tenant: tenantId, p_feature: "custom_mail_domain" }),
  ]);
  const locale = t?.locale === "en" ? "en" : "de";
  const settings = (t?.shop_settings ?? {}) as { contact_email?: string | null };
  const sender = buildSender({
    shopName: t?.name ?? "Sellycat",
    fromName: t?.mail_from_name ?? null,
    replyTo: t?.reply_to ?? null,
    contactEmail: settings.contact_email ?? null,
    locale,
    platformDomain: platformMailDomain(),
    own: own ? { domain: own.domain, localPart: own.local_part, status: own.status } : null,
    planAllowsOwn: allows === true,
  });
  return { ...sender, shopName: t?.name ?? "Sellycat", locale };
}
