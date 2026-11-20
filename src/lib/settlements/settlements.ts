import "server-only";
import { loadSender } from "@/lib/mail/sender-load";
import { sendMail } from "@/lib/mail/mailgun";
import { esc } from "@/lib/mail/templates";
import { fmt, getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/shop/deal-status";
import { createClient } from "@/lib/supabase/server";
import type { PartnerBilling } from "./billing";
import { periodText } from "./period";
import { renderSettlementPdf } from "./pdf";

export type SettlementStatus = "draft" | "final" | "paid";
export type SettlementRow = {
  id: string;
  number: number | null;
  status: SettlementStatus;
  partner_id: string | null;
  period_from: string | null;
  period_to: string;
  currency: string;
  base_cents: number;
  commission_cents: number;
  payout_cents: number;
  partner: { name?: string; email?: string | null; billing?: PartnerBilling };
  created_at: string;
  finalized_at: string | null;
  paid_at: string | null;
  sent_at: string | null;
};
export type LineRow = { id: string; kind: "sale" | "redemption" | "correction"; deal_title: string; code: string; occurred_at: string; base_cents: number; commission_cents: number; payout_cents: number };

const COLS = "id, number, status, partner_id, period_from, period_to, currency, base_cents, commission_cents, payout_cents, partner, created_at, finalized_at, paid_at, sent_at";

/** All statements of a shop (RLS: owners, admins, staff). */
export async function listSettlements(tenantId: string): Promise<SettlementRow[]> {
  const db = await createClient();
  const { data } = await db.from("partner_settlements").select(COLS).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(300);
  return (data ?? []) as SettlementRow[];
}

export async function loadSettlement(tenantId: string, id: string): Promise<{ s: SettlementRow; lines: LineRow[] } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await createClient();
  const { data: s } = await db.from("partner_settlements").select(COLS).eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  if (!s) return null;
  const { data: lines } = await db
    .from("partner_settlement_lines")
    .select("id, kind, deal_title, code, occurred_at, base_cents, commission_cents, payout_cents")
    .eq("settlement_id", id)
    .order("occurred_at");
  return { s: s as SettlementRow, lines: (lines ?? []) as LineRow[] };
}

export type OpenRow = { partner_id: string; partner_name: string; lines: number; base_cents: number; commission_cents: number; payout_cents: number; has_draft: boolean };

export async function openAmounts(tenantId: string, until: string): Promise<OpenRow[]> {
  const db = await createClient();
  const { data, error } = await db.rpc("settlement_open", { p_tenant: tenantId, p_until: until });
  if (error) throw error;
  return (data ?? []) as OpenRow[];
}

/** Drafts for the given partners (or all with open items); returns how many were created. */
export async function createSettlements(tenantId: string, until: string, partnerIds?: string[]): Promise<number> {
  const db = await createClient();
  const ids = partnerIds ?? (await openAmounts(tenantId, until)).map((o) => o.partner_id);
  let n = 0;
  for (const p of ids) {
    const { data, error } = await db.rpc("create_settlement", { p_tenant: tenantId, p_partner: p, p_until: until });
    if (error) throw error;
    if (data) n++;
  }
  return n;
}

export async function setStatus(id: string, status: "final" | "paid" | "deleted"): Promise<boolean> {
  const db = await createClient();
  const { error } = await db.rpc("settlement_set_status", { p_settlement: id, p_status: status });
  return !error;
}

export type ShopInfo = { name: string; locale: "de" | "en"; billing: Record<string, string> };

async function shopInfo(tenantId: string): Promise<ShopInfo> {
  const db = await createClient();
  const { data } = await db.from("tenants").select("name, locale, billing").eq("id", tenantId).single();
  return { name: data?.name ?? "", locale: data?.locale === "en" ? "en" : "de", billing: (data?.billing ?? {}) as Record<string, string> };
}

export async function settlementPdf(tenantId: string, id: string): Promise<{ pdf: Buffer; filename: string; found: { s: SettlementRow; lines: LineRow[] }; shop: ShopInfo } | null> {
  const found = await loadSettlement(tenantId, id);
  if (!found) return null;
  const shop = await shopInfo(tenantId);
  const pdf = await renderSettlementPdf({ shop, settlement: found.s, lines: found.lines });
  const name = (found.s.partner.name ?? "partner").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `abrechnung-${found.s.number ?? "entwurf"}-${name || "partner"}.pdf`;
  return { pdf, filename, found, shop };
}

/** Mails the finalised statement as PDF to the partner, from the shop's sender. */
export async function sendSettlement(tenantId: string, id: string): Promise<{ ok: boolean; email?: string; error?: "email" | "state" | "failed" }> {
  const r = await settlementPdf(tenantId, id);
  if (!r) return { ok: false, error: "failed" };
  const { s } = r.found;
  if (s.status === "draft") return { ok: false, error: "state" };
  const email = s.partner.email;
  if (!email) return { ok: false, error: "email" };
  const sender = await loadSender(tenantId);
  const t = getDictionary(r.shop.locale).settlements;
  const vars = { number: s.number ?? "", shop: r.shop.name, name: s.partner.name ?? "", period: periodText(s.period_from, s.period_to, r.shop.locale), amount: formatMoney(s.payout_cents, s.currency, r.shop.locale) };
  const text = fmt(t.mailIntro, vars);
  const sent = await sendMail({
    domain: sender.domain,
    from: sender.from,
    replyTo: sender.replyTo,
    to: email,
    subject: fmt(t.mailSubject, vars),
    text: `${text}\n\n${r.shop.name}`,
    html: `<p>${esc(text)}</p><p>${esc(r.shop.name)}</p>`,
    tag: "partner-settlement",
    attachments: [{ filename: r.filename, content: r.pdf, contentType: "application/pdf" }],
  }).catch(() => ({ ok: false }));
  if (!sent.ok) return { ok: false, error: "failed" };
  const db = await createClient();
  await db.rpc("settlement_mark_sent", { p_settlement: id });
  return { ok: true, email };
}
