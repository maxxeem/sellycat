import "server-only";

/**
 * Mailgun HTTP API (EU region): sending with attachments, and managing a shop's own sender
 * domain. Inert without MAILGUN_API_KEY: callers get `{ ok: false }`.
 */
export type MailResult = { ok: true; id: string; skipped?: boolean } | { ok: false; error: string };
export type Attachment = { filename: string; content: Uint8Array; contentType: string };

const base = () => (process.env.MAILGUN_API_BASE ?? "https://api.eu.mailgun.net").replace(/\/$/, "");
/** Account key for domain management (falls back to the sending key if that one has the rights). */
const accountKey = () => process.env.MAILGUN_ACCOUNT_KEY || process.env.MAILGUN_API_KEY || "";
const auth = (key: string) => ({ Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}` });

export const mailConfigured = () => Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
/** Sellycat's own sending domain. */
export const platformMailDomain = () => process.env.MAILGUN_DOMAIN ?? "mail.sellycat.com";

/** Reserved test domains (RFC 2606) accept no mail: skipped instead of collecting bounces. */
export const isReservedAddress = (to: string) => /@([^@]+\.)?(example\.(com|net|org)|test|invalid|localhost)$/i.test(to);

export async function sendMail(input: {
  /** Sending domain (Sellycat's or the shop's own, verified). */
  domain: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  tag?: string;
  attachments?: Attachment[];
}): Promise<MailResult> {
  if (!mailConfigured()) return { ok: false, error: "Mailversand nicht konfiguriert (MAILGUN_API_KEY/MAILGUN_DOMAIN)." };
  if (isReservedAddress(input.to)) return { ok: true, id: "skipped-reserved-domain", skipped: true };
  // The sending key belongs to Sellycat's domain; a shop's own domain needs the account key.
  const key = input.domain === platformMailDomain() ? process.env.MAILGUN_API_KEY! : accountKey();
  const body = new FormData();
  body.append("from", input.from);
  body.append("to", input.to);
  body.append("subject", input.subject);
  body.append("html", input.html);
  body.append("text", input.text);
  if (input.replyTo) body.append("h:Reply-To", input.replyTo);
  if (input.tag) body.append("o:tag", input.tag);
  for (const a of input.attachments ?? []) body.append("attachment", new Blob([a.content as BlobPart], { type: a.contentType }), a.filename);
  try {
    const res = await fetch(`${base()}/v3/${encodeURIComponent(input.domain)}/messages`, { method: "POST", headers: auth(key), body });
    if (!res.ok) return { ok: false, error: `Mailgun ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id ?? "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mailgun nicht erreichbar." };
  }
}

// ---------------------------------------------------------------- sender domains

export type DnsRecord = { type: string; name: string; value: string; priority?: string; valid: boolean; purpose: "sending" | "receiving" };
export type DomainState = { ok: true; state: "active" | "unverified" | "disabled"; records: DnsRecord[] } | { ok: false; error: string; status?: number };

type MailgunRecord = { record_type?: string; name?: string; value?: string; priority?: string; valid?: string };

function toState(json: { domain?: { state?: string }; sending_dns_records?: MailgunRecord[]; receiving_dns_records?: MailgunRecord[] }): DomainState {
  const map = (r: MailgunRecord, purpose: DnsRecord["purpose"]): DnsRecord => ({
    type: r.record_type ?? "",
    name: r.name ?? "",
    value: r.value ?? "",
    ...(r.priority ? { priority: r.priority } : {}),
    valid: r.valid === "valid",
    purpose,
  });
  const state = json.domain?.state === "active" ? "active" : json.domain?.state === "disabled" ? "disabled" : "unverified";
  return {
    ok: true,
    state,
    records: [...(json.sending_dns_records ?? []).map((r) => map(r, "sending")), ...(json.receiving_dns_records ?? []).map((r) => map(r, "receiving"))],
  };
}

async function domainCall(path: string, init: RequestInit = {}): Promise<DomainState> {
  const key = accountKey();
  if (!key) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(`${base()}${path}`, { ...init, headers: { ...auth(key), ...(init.headers ?? {}) } });
    if (!res.ok) return { ok: false, status: res.status, error: `Mailgun ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return toState(await res.json());
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mailgun nicht erreichbar." };
  }
}

/**
 * Adds the domain to the Mailgun account (EU, 2048-bit DKIM) and returns the DNS records to set.
 * A domain that is already in the account is never taken over (it may be another product's).
 */
export async function createSenderDomain(domain: string): Promise<DomainState> {
  const body = new URLSearchParams({ name: domain, dkim_key_size: "2048", web_scheme: "https" });
  return domainCall("/v4/domains", { method: "POST", body });
}

export const getSenderDomain = (domain: string) => domainCall(`/v4/domains/${encodeURIComponent(domain)}`);

/** Asks Mailgun to look at the DNS again. */
export const verifySenderDomain = (domain: string) => domainCall(`/v4/domains/${encodeURIComponent(domain)}/verify`, { method: "PUT" });

export async function deleteSenderDomain(domain: string): Promise<boolean> {
  const key = accountKey();
  if (!key) return false;
  const res = await fetch(`${base()}/v3/domains/${encodeURIComponent(domain)}`, { method: "DELETE", headers: auth(key) }).catch(() => null);
  return Boolean(res && (res.ok || res.status === 404));
}
