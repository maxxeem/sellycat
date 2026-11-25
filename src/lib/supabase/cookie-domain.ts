import { siteHost } from "@/lib/site/hosts";

/**
 * May the account (Supabase) session live on this host? Only on Sellycat's own hosts and in
 * development; never on a customer's domain, whose owner could read it.
 */
export function ownsAccountSession(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase().split(":")[0]!;
  if (!h) return false;
  return cookieDomainFor(h) !== undefined || h === "localhost" || h.endsWith(".localhost") || h === "127.0.0.1" || h.endsWith(".vercel.app");
}

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
