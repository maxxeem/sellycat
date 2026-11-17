/**
 * Who a shop's mails come from. A shop sends through its own verified domain when its plan
 * allows it (`custom_mail_domain`), else through Sellycat's domain in the shop's name. Pure, so
 * the rules are testable; `loadSender` (sender-load.ts) fetches the inputs.
 */
export type SenderInput = {
  shopName: string;
  fromName: string | null;
  replyTo: string | null;
  contactEmail: string | null;
  locale: "de" | "en";
  platformDomain: string;
  own: { domain: string; localPart: string; status: string } | null;
  planAllowsOwn: boolean;
};
export type Sender = { domain: string; from: string; address: string; replyTo: string | null; own: boolean };

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Display name without characters that could break the header. */
export function displayName(name: string): string {
  return name.replace(/[\r\n"<>\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Sellycat";
}

export function buildSender(i: SenderInput): Sender {
  const own = i.own && i.own.status === "active" && i.planAllowsOwn ? i.own : null;
  const domain = own ? own.domain : i.platformDomain;
  const address = `${own ? own.localPart : i.locale === "en" ? "vouchers" : "gutscheine"}@${domain}`;
  const name = displayName(i.fromName?.trim() || i.shopName);
  const replyTo = [i.replyTo, i.contactEmail].map((x) => x?.trim() ?? "").find((x) => EMAIL.test(x)) ?? null;
  return { domain, address, from: `"${name}" <${address}>`, replyTo, own: Boolean(own) };
}

/** A sender domain the shop may enter: a subdomain like mail.example.ch, not Sellycat's own. */
export function normaliseMailDomain(raw: string): string | null {
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d) || d.length > 200) return null;
  if (d === "sellycat.com" || d.endsWith(".sellycat.com")) return null;
  return d;
}

/** A sender domain should be a subdomain (mail.example.ch) so the shop's normal mailbox stays untouched. */
export const isSubdomain = (d: string) => d.split(".").length >= 3;
