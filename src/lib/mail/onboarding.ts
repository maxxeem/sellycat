import "server-only";
import { apexUrl } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { platformMailDomain, sendMail } from "./mailgun";
import { platformBrand, subscriptionMail, welcomeMail, type Mail } from "./templates";

/**
 * Sellycat's own mails to a customer (shop owners): welcome with the first steps after the shop
 * was created, thanks after a paid plan was booked. Sent from Sellycat, in the shop's language.
 */

type Owner = { email: string; name: string };

async function shopAndOwners(tenantId: string) {
  const admin = createAdminClient();
  const [{ data: tenant }, { data: members }] = await Promise.all([
    admin.from("tenants").select("name, slug, locale, plan_id").eq("id", tenantId).maybeSingle(),
    admin.from("tenant_members").select("user_id").eq("tenant_id", tenantId).eq("role", "owner"),
  ]);
  const owners: Owner[] = [];
  for (const m of members ?? []) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    if (data.user?.email) owners.push({ email: data.user.email, name: meta.full_name ?? meta.name ?? "" });
  }
  const { data: host } = await admin.from("tenant_domains").select("hostname").eq("tenant_id", tenantId).eq("is_primary", true).maybeSingle();
  return { tenant, owners, shopUrl: host?.hostname ? `https://${host.hostname}` : apexUrl() };
}

async function deliver(to: string, mail: Mail, tag: string) {
  const domain = platformMailDomain();
  await sendMail({ domain, from: `Sellycat <hello@${domain}>`, replyTo: "hello@sellycat.com", to, ...mail, tag });
}

/** Welcome with the first steps (call once, right after the shop was created). */
export async function sendWelcomeMail(tenantId: string): Promise<void> {
  const { tenant, owners, shopUrl } = await shopAndOwners(tenantId);
  if (!tenant) return;
  const locale = tenant.locale === "en" ? "en" : "de";
  const site = apexUrl();
  for (const o of owners) await deliver(o.email, welcomeMail({ brand: platformBrand(locale, site), name: o.name, shopName: tenant.name, shopUrl, siteUrl: site }), "welcome");
}

/** Thanks after a paid plan was booked (checkout completed). */
export async function sendSubscriptionMail(tenantId: string): Promise<void> {
  const { tenant, owners } = await shopAndOwners(tenantId);
  if (!tenant?.plan_id) return;
  const { data: plan } = await createAdminClient().from("plans").select("name").eq("id", tenant.plan_id).maybeSingle();
  const locale = tenant.locale === "en" ? "en" : "de";
  const site = apexUrl();
  for (const o of owners) await deliver(o.email, subscriptionMail({ brand: platformBrand(locale, site), name: o.name, shopName: tenant.name, planName: plan?.name ?? tenant.plan_id, siteUrl: site }), "subscription");
}
