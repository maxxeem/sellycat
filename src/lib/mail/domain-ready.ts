import type { DnsRecord, DomainState } from "./mailgun";

/**
 * When a shop's own sender domain may be used: Mailgun has verified it (SPF, DKIM) and it has MX
 * records. Without MX, providers like iCloud reject the mails. Any MX counts (a domain with its own
 * mailboxes keeps them). `mx` is null when the DNS could not be asked: then Mailgun's view counts,
 * and a domain already in use stays in use. Pure.
 */
export function domainColumns(state: Extract<DomainState, { ok: true }>, mx: boolean | null, wasActive: boolean) {
  const receiving = state.records.filter((r) => r.purpose === "receiving");
  const hasMx = mx ?? (wasActive || (receiving.length > 0 && receiving.every((r) => r.valid)));
  const active = state.state === "active" && hasMx;
  const records: DnsRecord[] = state.records.map((r) => (r.purpose === "receiving" && mx !== null ? { ...r, valid: mx } : r));
  return { status: active ? "active" : "pending", records, error: null };
}
