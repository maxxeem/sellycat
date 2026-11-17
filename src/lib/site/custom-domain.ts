/**
 * A shop's own web domain: input check, the DNS records to set and the DNS provider (for the
 * step-by-step guide). Pure and tested; the Vercel calls live in src/lib/vercel/domains.ts.
 */
export type DomainError = "invalid" | "platform";
export type ParsedDomain = { host: string; apex: string; sub: string | null };

/** Second-level registries that work like a TLD (enough for the markets we serve). */
const MULTI_SUFFIX = new Set(["co.uk", "org.uk", "ac.uk", "com.au", "net.au", "co.at", "or.at", "co.nz", "com.br", "co.jp", "com.tr", "co.za", "com.mx", "com.es"]);

export function parseCustomDomain(input: string, platformRoot: string): { ok: true; domain: ParsedDomain } | { ok: false; error: DomainError } {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  const labels = host.split(".");
  if (host.length > 253 || labels.length < 2 || labels.some((l) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) || !/^[a-z]{2,63}$/.test(labels.at(-1)!)) return { ok: false, error: "invalid" };
  const root = platformRoot.toLowerCase().split(":")[0];
  if (host === root || host.endsWith(`.${root}`) || host.endsWith(".vercel.app") || host.endsWith(".localhost")) return { ok: false, error: "platform" };
  const suffixLen = MULTI_SUFFIX.has(labels.slice(-2).join(".")) ? 2 : 1;
  if (labels.length <= suffixLen) return { ok: false, error: "invalid" };
  const apex = labels.slice(-(suffixLen + 1)).join(".");
  const sub = host === apex ? null : host.slice(0, -(apex.length + 1));
  return { ok: true, domain: { host, apex, sub } };
}

export type DnsRow = { type: "A" | "CNAME" | "TXT"; name: string; value: string; purpose: "route" | "www" | "verify" };

/**
 * What to enter at the DNS provider. `name` is relative to the apex ("@" for the apex itself),
 * which is how GoDaddy, Infomaniak, Hostpoint and Cloudflare ask for it.
 */
export function dnsRows(d: ParsedDomain, opts: { cname: string; ipv4: string[]; www: boolean; verification: Array<{ type: string; domain: string; value: string }> }): DnsRow[] {
  const rel = (fqdn: string) => (fqdn === d.apex ? "@" : fqdn.endsWith(`.${d.apex}`) ? fqdn.slice(0, -(d.apex.length + 1)) : fqdn);
  const rows: DnsRow[] = d.sub ? [{ type: "CNAME", name: d.sub, value: opts.cname, purpose: "route" }] : opts.ipv4.map((ip) => ({ type: "A" as const, name: "@", value: ip, purpose: "route" as const }));
  if (!d.sub && opts.www) rows.push({ type: "CNAME", name: "www", value: opts.cname, purpose: "www" });
  for (const v of opts.verification) if (v.type === "TXT") rows.push({ type: "TXT", name: rel(v.domain), value: v.value, purpose: "verify" });
  return rows;
}

export const DNS_PROVIDERS = ["godaddy", "infomaniak", "hostpoint", "cloudflare", "other"] as const;
export type DnsProvider = (typeof DNS_PROVIDERS)[number];

/** Nameservers → provider (for the matching guide). */
export function providerFromNs(nameservers: string[]): DnsProvider {
  const ns = nameservers.join(" ").toLowerCase();
  if (ns.includes("domaincontrol.com")) return "godaddy";
  if (ns.includes("cloudflare.com")) return "cloudflare";
  if (ns.includes("infomaniak")) return "infomaniak";
  if (ns.includes("hostpoint.ch")) return "hostpoint";
  return "other";
}
