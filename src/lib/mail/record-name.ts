import { parseCustomDomain } from "@/lib/site/custom-domain";

/**
 * Mailgun names records in full (and leaves MX without a name: they belong to the sender domain
 * itself). DNS providers ask for the name relative to the main domain, so that is what we show.
 */
export function recordName(name: string, domain: string): { host: string; full: string } {
  const full = (name || domain).toLowerCase().replace(/\.$/, "");
  const p = parseCustomDomain(domain, "sellycat.com");
  const apex = p.ok ? p.domain.apex : domain;
  const host = full === apex ? "@" : full.endsWith(`.${apex}`) ? full.slice(0, -(apex.length + 1)) : full;
  return { host, full };
}
