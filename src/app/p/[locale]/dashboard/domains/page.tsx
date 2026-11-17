import { Suspense } from "react";
import { Card, Notice, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { parseCustomDomain, type DnsProvider, type DnsRow } from "@/lib/site/custom-domain";
import { mailConfigured, platformMailDomain, type DnsRecord } from "@/lib/mail/mailgun";
import { buildSender } from "@/lib/mail/sender";
import { createAdminClient } from "@/lib/supabase/admin";
import { MailDomainPanel } from "./mail-domain-panel";
import { ShopDomainPanel, type ShopDomainView } from "./shop-domain-panel";

export const metadata = { title: "Domains" };

export default async function DomainsPage({ params }: PageProps<"/p/[locale]/dashboard/domains">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.mailDomain.pageTitle} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Domains t={t} />
      </Suspense>
    </>
  );
}

async function Domains({ t }: { t: Dictionary }) {
  const { tenant } = await requireTenant("admin");
  const m = t.mailDomain;
  const admin = createAdminClient();
  const [{ data: info }, { data: own }, { data: allowed }, { data: hosts }, { data: domainAllowed }] = await Promise.all([
    admin.from("tenants").select("name, locale, mail_from_name, reply_to, shop_settings").eq("id", tenant.id).single(),
    admin.from("mail_domains").select("domain, local_part, status, records, error, last_checked_at").eq("tenant_id", tenant.id).maybeSingle(),
    admin.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "custom_mail_domain" }),
    admin.from("tenant_domains").select("hostname, kind, status, is_primary, verification, provider, last_checked_at").eq("tenant_id", tenant.id).order("created_at"),
    admin.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "custom_domain" }),
  ]);
  const root = (siteHost() || DEFAULT_ROOT).split(":")[0];
  const sub = (hosts ?? []).find((h) => h.kind === "subdomain");
  const sellycatHost = sub?.hostname ?? `${tenant.slug}.${root}`;
  const custom: ShopDomainView[] = (hosts ?? [])
    .filter((h) => h.kind === "custom")
    .map((h) => {
      const p = parseCustomDomain(h.hostname, root);
      return {
        hostname: h.hostname,
        apex: p.ok ? p.domain.apex : h.hostname,
        status: h.status,
        isPrimary: h.is_primary,
        records: (Array.isArray(h.verification) ? h.verification : []) as unknown as DnsRow[],
        provider: (h.provider as DnsProvider | null) ?? null,
        checkedAt: h.last_checked_at,
      };
    });
  const planAllows = allowed === true;
  const sender = buildSender({
    shopName: info?.name ?? tenant.name,
    fromName: info?.mail_from_name ?? null,
    replyTo: info?.reply_to ?? null,
    contactEmail: ((info?.shop_settings ?? {}) as { contact_email?: string | null }).contact_email ?? null,
    locale: info?.locale === "en" ? "en" : "de",
    platformDomain: platformMailDomain(),
    own: own ? { domain: own.domain, localPart: own.local_part, status: own.status } : null,
    planAllowsOwn: planAllows,
  });

  return (
    <div className="flex flex-col gap-6">
      <Card title={t.shopDomain.title} description={t.shopDomain.intro}>
        <ShopDomainPanel root={root} sellycatHost={sellycatHost} sellycatPrimary={!custom.some((d) => d.isPrimary)} planAllows={domainAllowed === true} domains={custom} />
      </Card>
      <Card title={m.title} description={m.intro}>
        {!mailConfigured() ? <Notice>{m.errors.not_configured}</Notice> : null}
        <MailDomainPanel
          sender={{ from: sender.from, own: sender.own }}
          planAllows={planAllows}
          domain={own ? { domain: own.domain, localPart: own.local_part, status: own.status as "pending" | "active" | "error", records: (own.records ?? []) as unknown as DnsRecord[], checkedAt: own.last_checked_at } : null}
        />
      </Card>
    </div>
  );
}
