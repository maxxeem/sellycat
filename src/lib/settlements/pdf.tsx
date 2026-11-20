import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmt, getDictionary } from "@/lib/i18n";
import { registerFonts } from "@/lib/vouchers/pdf";
import { billingLines } from "./billing";
import { periodText } from "./period";
import type { LineRow, SettlementRow, ShopInfo } from "./settlements";

/** Partner statement (A4): sender, partner address, period, lines, totals, where the money goes. */
const MUTED = "#6b6b70";
const LINE = "#e4e4e7";

export async function renderSettlementPdf(i: { shop: ShopInfo; settlement: SettlementRow; lines: LineRow[] }): Promise<Buffer> {
  await registerFonts();
  const { shop, settlement: s, lines } = i;
  const locale = shop.locale;
  const t = getDictionary(locale).settlements;
  // Statements always show cents (accounting).
  const money = (c: number) => new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-GB", { style: "currency", currency: s.currency, minimumFractionDigits: 2 }).format(c / 100);
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
  const b = shop.billing;
  const from = [b.legal_name || shop.name, b.street, [b.zip, b.city].filter(Boolean).join(" "), b.vat_no ? `MWST ${b.vat_no}` : null].filter(Boolean) as string[];
  const partnerBilling = s.partner.billing ?? {};
  const to = billingLines(s.partner.name ?? "", partnerBilling);
  const period = periodText(s.period_from, s.period_to, locale);
  const title = s.number ? `${t.pdfTitle} ${s.number}` : `${t.pdfTitle} (${t.pdfDraft})`;
  const cell = { fontSize: 8, paddingVertical: 3 };
  const cols = [
    { w: "13%", label: t.date },
    { w: "30%", label: t.deal },
    { w: "16%", label: t.code },
    { w: "11%", label: t.kind },
    { w: "10%", label: t.base, right: true },
    { w: "10%", label: t.commission, right: true },
    { w: "10%", label: t.payout, right: true },
  ];

  const doc = (
    <Document title={title} author={shop.name}>
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: "#111111", paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 32 }}>
          <View>
            {from.map((l, k) => (
              <Text key={k} style={{ fontWeight: k === 0 ? 700 : 400, color: k === 0 ? "#111111" : MUTED }}>{l}</Text>
            ))}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: MUTED }}>{s.finalized_at ? day(s.finalized_at) : day(s.created_at)}</Text>
          </View>
        </View>
        <View style={{ marginBottom: 28 }}>
          {to.map((l, k) => (
            <Text key={k} style={{ fontWeight: k === 0 ? 600 : 400 }}>{l}</Text>
          ))}
        </View>
        <Text style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</Text>
        <Text style={{ color: MUTED, marginBottom: 18 }}>{fmt(t.pdfIntro, { shop: shop.name, period })}</Text>

        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: "#111111", paddingBottom: 3 }} fixed>
          {cols.map((c) => (
            <Text key={c.label} style={{ width: c.w, fontSize: 7.5, fontWeight: 600, textAlign: c.right ? "right" : "left" }}>{c.label}</Text>
          ))}
        </View>
        {lines.map((l) => (
          <View key={l.id} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE }} wrap={false}>
            <Text style={{ ...cell, width: cols[0].w }}>{day(l.occurred_at)}</Text>
            <Text style={{ ...cell, width: cols[1].w, paddingRight: 6 }}>{l.deal_title}</Text>
            <Text style={{ ...cell, width: cols[2].w }}>{l.code}</Text>
            <Text style={{ ...cell, width: cols[3].w, color: l.kind === "correction" ? "#b42318" : "#111111" }}>{t.kinds[l.kind]}</Text>
            <Text style={{ ...cell, width: cols[4].w, textAlign: "right" }}>{money(l.base_cents)}</Text>
            <Text style={{ ...cell, width: cols[5].w, textAlign: "right" }}>{money(l.commission_cents)}</Text>
            <Text style={{ ...cell, width: cols[6].w, textAlign: "right" }}>{money(l.payout_cents)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", paddingTop: 5 }} wrap={false}>
          <Text style={{ width: "70%", fontWeight: 600 }}>{t.total}</Text>
          <Text style={{ width: "10%", textAlign: "right", fontWeight: 600 }}>{money(s.base_cents)}</Text>
          <Text style={{ width: "10%", textAlign: "right", fontWeight: 600 }}>{money(s.commission_cents)}</Text>
          <Text style={{ width: "10%", textAlign: "right", fontWeight: 600 }}>{money(s.payout_cents)}</Text>
        </View>

        <View style={{ marginTop: 26, padding: 14, borderWidth: 1, borderColor: LINE, borderRadius: 8 }} wrap={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>{t.pdfPayout}</Text>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>{money(s.payout_cents)}</Text>
          </View>
          <Text style={{ color: MUTED, marginBottom: 3 }}>{t.pdfPayment}</Text>
          {partnerBilling.iban ? (
            <Text style={{ fontWeight: 600 }}>{`${partnerBilling.legal_name || s.partner.name || ""} · ${partnerBilling.iban}`}</Text>
          ) : (
            <Text style={{ color: "#b42318" }}>{t.pdfNoIban}</Text>
          )}
        </View>

        <Text
          style={{ position: "absolute", bottom: 28, left: 44, right: 44, fontSize: 7, color: MUTED, textAlign: "center" }}
          fixed
          render={({ pageNumber, totalPages }) => `${shop.name} · ${title} · ${pageNumber}/${totalPages} · ${t.pdfFooter}`}
        />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
