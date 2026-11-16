import { siteHost } from "@/lib/site/hosts";

/**
 * Auth cookies on the apex and on <slug>.<root> shops carry `domain=.<root>`, so a redeemer
 * signed in on sellycat.com is also signed in on <slug>.sellycat.com. Custom domains and
 * localhost/previews keep host-only cookies.
 */
export function cookieDomainFor(host: string | null | undefined): string | undefined {
  const root = siteHost().split(":")[0];
  if (!root || !host || root === "localhost") return undefined;
  const h = host.toLowerCase().split(":")[0];
  return h === root || h.endsWith(`.${root}`) ? `.${root}` : undefined;
}
