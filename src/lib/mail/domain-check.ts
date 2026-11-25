import "server-only";
import { resolveMx } from "node:dns/promises";
import { createAdminClient } from "@/lib/supabase/admin";
import { domainColumns } from "./domain-ready";
import { verifySenderDomain, type DomainState } from "./mailgun";

/** Does the domain have MX records? null when the DNS gave no answer. */
async function hasMx(domain: string): Promise<boolean | null> {
  try {
    return (await resolveMx(domain)).some((r) => r.exchange && r.exchange !== ".");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === "ENODATA" || code === "ENOTFOUND" ? false : null;
  }
}

/** Columns of `mail_domains` for what Mailgun and the DNS say right now. */
export async function currentColumns(domain: string, state: Extract<DomainState, { ok: true }>, wasActive: boolean) {
  const c = domainColumns(state, await hasMx(domain), wasActive);
  const now = new Date().toISOString();
  return { ...c, last_checked_at: now, ...(c.status === "active" && !wasActive ? { verified_at: now } : {}) };
}

/**
 * Daily: checks every sender domain again. Finished ones switch on by themselves; one that lost a
 * record goes back to Sellycat's sender. A failed call to Mailgun changes nothing.
 */
export async function recheckMailDomains(): Promise<{ domains: number; changed: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin.from("mail_domains").select("tenant_id, domain, status").order("last_checked_at", { ascending: true, nullsFirst: true }).limit(200);
  const out = { domains: 0, changed: 0 };
  const until = Date.now() + 60_000;
  for (const row of rows ?? []) {
    if (Date.now() > until) break;
    const state = await verifySenderDomain(row.domain);
    if (!state.ok) {
      console.error(`[mail-domain] recheck ${row.domain}:`, state.error);
      continue;
    }
    const c = await currentColumns(row.domain, state, row.status === "active");
    await admin.from("mail_domains").update(c).eq("tenant_id", row.tenant_id).eq("domain", row.domain);
    out.domains += 1;
    if (c.status !== row.status) {
      out.changed += 1;
      console.warn(`[mail-domain] ${row.domain}: ${row.status} -> ${c.status}`);
    }
  }
  return out;
}
