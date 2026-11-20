/** Partner billing details for settlements (pure, isomorphic, unit-tested). */

export type PartnerBilling = { legal_name?: string; street?: string; zip?: string; city?: string; country?: string; vat_no?: string; iban?: string };

const FIELDS = ["legal_name", "street", "zip", "city", "country", "vat_no", "iban"] as const;

/** IBAN with valid checksum (ISO 13616, mod 97), grouped in fours; null when invalid. */
export function normaliseIban(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact)) return null;
  const moved = compact.slice(4) + compact.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of n) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1 ? compact.replace(/(.{4})/g, "$1 ").trim() : null;
}

/** Cleans the form values; `iban` is null when given but invalid. */
export function cleanBilling(input: Record<string, unknown>): { billing: PartnerBilling; ibanInvalid: boolean } {
  const billing: PartnerBilling = {};
  for (const k of FIELDS) {
    const v = String(input[k] ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, k === "legal_name" ? 160 : 120);
    if (v) billing[k] = k === "country" ? v.toUpperCase().slice(0, 2) : v;
  }
  if (billing.iban) {
    const iban = normaliseIban(billing.iban);
    if (!iban) return { billing, ibanInvalid: true };
    billing.iban = iban;
  }
  return { billing, ibanInvalid: false };
}

/** Address lines for documents (legal name falls back to the partner name). */
export function billingLines(name: string, b: PartnerBilling): string[] {
  return [b.legal_name || name, b.street, [b.zip, b.city].filter(Boolean).join(" "), b.country && b.country !== "CH" ? b.country : null].filter((x): x is string => Boolean(x));
}
