import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { Card, Notice, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import { shopBase } from "@/lib/mail/deliver";
import { mailConfigured, platformMailDomain, type DnsRecord } from "@/lib/mail/mailgun";
import { buildSender } from "@/lib/mail/sender";
import { createAdminClient } from "@/lib/supabase/admin";
import { MailDomainPanel } from "./mail-domain-panel";

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
  const [{ data: info }, { data: own }, { data: allowed }, { data: primary }] = await Promise.all([
    admin.from("tenants").select("name, locale, mail_from_name, reply_to, shop_settings").eq("id", tenant.id).single(),
    admin.from("mail_domains").select("domain, local_part, status, records, error, last_checked_at").eq("tenant_id", tenant.id).maybeSingle(),
    admin.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "custom_mail_domain" }),
    admin.from("tenant_domains").select("hostname").eq("tenant_id", tenant.id).eq("is_primary", true).maybeSingle(),
  ]);
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
  const shopUrl = shopBase({ primaryHost: primary?.hostname ?? null, slug: tenant.slug });

  return (
    <div className="flex flex-col gap-6">
      <Card title={m.shopTitle} description={m.shopText}>
        <a href={shopUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono text-sm font-semibold hover:underline">
          {shopUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <p className="mt-3 text-sm text-muted">{m.shopOwnSoon}</p>
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
