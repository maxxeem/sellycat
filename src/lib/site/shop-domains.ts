import "server-only";
import { getStripe, stripeConfigured } from "@/lib/payments/stripe";
import { siteHost, DEFAULT_ROOT } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { addProjectDomain, domainConfig, getProjectDomain, removeProjectDomain, verifyProjectDomain } from "@/lib/vercel/domains";
import { dnsRows, parseCustomDomain, providerFromNs, type DnsProvider, type DnsRow, type ParsedDomain } from "./custom-domain";

/**
 * A shop's own web domains (service role; callers check the role first). Vercel serves the
 * domain and issues the certificate; we keep the DNS guide, the status and the main address.
 */
export const MAX_CUSTOM_DOMAINS = 3;

export type DomainActionError = "invalid" | "platform" | "plan" | "limit" | "taken" | "in_use" | "not_configured" | "not_found" | "rejected" | "failed";
/** `detail` carries Vercel's own message when Vercel refused the domain (shown next to our text). */
export type DomainFailure = { ok: false; error: DomainActionError; detail?: string };

/** Maps a failed Vercel call to our error and logs it (the message is the only clue to the cause). */
function vercelFailure(step: string, host: string, r: { status: number; code: string; message: string }): DomainFailure {
  console.error(`[domains] ${step} ${host}: ${r.status} ${r.code} ${r.message}`);
  if (r.code === "not_configured") return { ok: false, error: "not_configured" };
  if (r.code === "in_use") return { ok: false, error: "in_use" };
  // 4xx: Vercel refused this domain for a reason the customer can act on; 5xx/network: try again.
  if (r.status >= 400 && r.status < 500) return { ok: false, error: "rejected", detail: r.message };
  return { ok: false, error: "failed" };
}
export type DomainState = "pending" | "dns_ok" | "active" | "error";

const root = () => (siteHost() || DEFAULT_ROOT).split(":")[0];

function parsed(hostname: string): ParsedDomain {
  const p = parseCustomDomain(hostname, root());
  return p.ok ? p.domain : { host: hostname, apex: hostname, sub: null };
}

export async function addShopDomain(tenantId: string, input: string, www: boolean): Promise<{ ok: true; hostname: string } | DomainFailure> {
  const p = parseCustomDomain(input, root());
  if (!p.ok) return { ok: false, error: p.error };
  const d = p.domain;
  const db = createAdminClient();
  const [{ data: allowed }, { count }, { data: existing }] = await Promise.all([
    db.rpc("plan_allows", { p_tenant: tenantId, p_feature: "custom_domain" }),
    db.from("tenant_domains").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("kind", "custom"),
    db.from("tenant_domains").select("tenant_id").eq("hostname", d.host).maybeSingle(),
  ]);
  if (allowed !== true) return { ok: false, error: "plan" };
  if (existing) return { ok: false, error: existing.tenant_id === tenantId ? "taken" : "in_use" };
  if ((count ?? 0) >= MAX_CUSTOM_DOMAINS) return { ok: false, error: "limit" };
  const withWww = www && !d.sub;

  const added = await addProjectDomain(d.host);
  if (!added.ok) return vercelFailure("add", d.host, added);
  if (withWww) {
    const w = await addProjectDomain(`www.${d.host}`, d.host);
    if (!w.ok && w.code !== "in_use") console.warn("[domains] www:", w.message);
  }
  const { error } = await db.from("tenant_domains").insert({ tenant_id: tenantId, hostname: d.host, kind: "custom", status: "pending", is_primary: false, www: withWww });
  if (error) {
    console.error(`[domains] insert ${d.host}:`, error.message);
    await removeProjectDomain(d.host);
    if (withWww) await removeProjectDomain(`www.${d.host}`);
    return { ok: false, error: error.code === "23505" ? "in_use" : "failed" };
  }
  await checkShopDomain(tenantId, d.host);
  return { ok: true, hostname: d.host };
}

/** Is our app answering on https://host? (certificate issued, DNS pointing to Vercel) */
async function servesHttps(host: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${host}/api/health`, { signal: AbortSignal.timeout(8000), redirect: "manual", cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return json?.ok === true;
  } catch {
    return false;
  }
}

/** Apple Pay in the embedded checkout needs the domain on the shop's Stripe account. */
async function registerPaymentDomain(tenantId: string, host: string) {
  if (!stripeConfigured()) return;
  const { data: acc } = await createAdminClient().from("stripe_accounts").select("account_id").eq("tenant_id", tenantId).maybeSingle();
  if (!acc?.account_id) return;
  for (const name of [host]) {
    await getStripe()
      .paymentMethodDomains.create({ domain_name: name }, { stripeAccount: acc.account_id })
      .catch((e: unknown) => console.warn(`[domains] apple pay ${name}:`, e instanceof Error ? e.message : e));
  }
}

/** Back to the Sellycat address as main address (when the own domain stops working or goes). */
async function fallbackPrimary(tenantId: string) {
  const db = createAdminClient();
  const { data: sub } = await db.from("tenant_domains").select("hostname").eq("tenant_id", tenantId).eq("kind", "subdomain").order("created_at").limit(1).maybeSingle();
  if (sub) await db.rpc("set_primary_domain", { p_tenant: tenantId, p_hostname: sub.hostname });
}

/** Checks one domain with Vercel and over HTTPS, stores the status and the DNS records to set. */
export async function checkShopDomain(tenantId: string, hostname: string): Promise<{ ok: true; status: DomainState } | DomainFailure> {
  const db = createAdminClient();
  const { data: row } = await db.from("tenant_domains").select("hostname, status, is_primary, www, active_at").eq("tenant_id", tenantId).eq("hostname", hostname).eq("kind", "custom").maybeSingle();
  if (!row) return { ok: false, error: "not_found" };
  let project = await getProjectDomain(row.hostname);
  if (project.ok && !project.value.verified) project = await verifyProjectDomain(row.hostname).then((r) => (r.ok ? r : project));
  if (!project.ok && project.status === 404) {
    // Removed in Vercel by hand: add it again.
    project = await addProjectDomain(row.hostname);
  }
  const config = await domainConfig(row.hostname);
  if (!project.ok || !config.ok) {
    const failure = !project.ok ? vercelFailure("project", row.hostname, project) : vercelFailure("config", row.hostname, config as Extract<typeof config, { ok: false }>);
    await db.from("tenant_domains").update({ error: failure.error === "in_use" ? "in_use" : "vercel", last_checked_at: new Date().toISOString() }).eq("hostname", row.hostname);
    return failure;
  }

  const verification = project.value.verified ? [] : project.value.verification;
  const rows: DnsRow[] = dnsRows(parsed(row.hostname), { cname: config.value.cname, ipv4: config.value.ipv4, www: row.www, verification });
  const provider: DnsProvider = providerFromNs(config.value.nameservers);
  const dnsOk = project.value.verified && !config.value.misconfigured;
  const status: DomainState = dnsOk ? ((await servesHttps(row.hostname)) ? "active" : "dns_ok") : "pending";
  const now = new Date().toISOString();
  await db
    .from("tenant_domains")
    .update({ status, verification: rows as never, provider, error: null, last_checked_at: now, ...(status === "active" && !row.active_at ? { active_at: now } : {}) })
    .eq("hostname", row.hostname);

  if (status === "active" && row.status !== "active") await registerPaymentDomain(tenantId, row.hostname);
  // A main domain that stopped working must not take the shop down: back to the Sellycat address.
  if (row.is_primary && status !== "active") await fallbackPrimary(tenantId);
  return { ok: true, status };
}

export async function setPrimaryDomain(tenantId: string, hostname: string): Promise<boolean> {
  const { data } = await createAdminClient().rpc("set_primary_domain", { p_tenant: tenantId, p_hostname: hostname });
  return data === true;
}

export async function removeShopDomain(tenantId: string, hostname: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: row } = await db.from("tenant_domains").select("hostname, is_primary, www").eq("tenant_id", tenantId).eq("hostname", hostname).eq("kind", "custom").maybeSingle();
  if (!row) return false;
  if (row.is_primary) await fallbackPrimary(tenantId);
  await removeProjectDomain(row.hostname);
  if (row.www) await removeProjectDomain(`www.${row.hostname}`);
  const { error } = await db.from("tenant_domains").delete().eq("tenant_id", tenantId).eq("hostname", row.hostname);
  return !error;
}

/** Cron: domains still waiting for DNS (up to 14 days) and a daily look at the live ones. */
export async function checkDueDomains(limit = 50): Promise<{ checked: number; tenants: string[] }> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data } = await db
    .from("tenant_domains")
    .select("tenant_id, hostname, status, created_at")
    .eq("kind", "custom")
    .or(`status.eq.active,created_at.gte.${since}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  const tenants = new Set<string>();
  for (const d of data ?? []) {
    const r = await checkShopDomain(d.tenant_id, d.hostname);
    if (r.ok && r.status !== d.status) tenants.add(d.tenant_id);
  }
  return { checked: data?.length ?? 0, tenants: [...tenants] };
}
