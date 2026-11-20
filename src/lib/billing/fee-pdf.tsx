import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmt, getDictionary } from "@/lib/i18n";
import { registerFonts } from "@/lib/vouchers/pdf";
import type { FeeLine } from "./fees";
import { monthName } from "./fees";

/** Fee overview of one month (A4): Sellycat → shop, one line per order, totals per currency. */
const MUTED = "#6b6b70";
const LINE = "#e4e4e7";

export async function renderFeePdf(i: { shop: { name: string; billing: Record<string, string> }; locale: "de" | "en"; month: string; lines: FeeLine[] }): Promise<Buffer> {
  await registerFonts();
  const t = getDictionary(i.locale).subscription.fees;
  const tag = i.locale === "de" ? "de-CH" : "en-GB";
  const money = (c: number, cur: string) => new Intl.NumberFormat(tag, { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(c / 100);
  const day = (iso: string) => new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
  const month = monthName(i.month, i.locale);
  const b = i.shop.billing;
  const to = [b.legal_name || i.shop.name, b.street, [b.zip, b.city].filter(Boolean).join(" ")].filter(Boolean) as string[];
  const totals = new Map<string, { amount: number; refunded: number; net: number; n: number }>();
  for (const l of i.lines) {
    const x = totals.get(l.currency) ?? { amount: 0, refunded: 0, net: 0, n: 0 };
    totals.set(l.currency, { amount: x.amount + l.amount_cents, refunded: x.refunded + l.refunded_cents, net: x.net + l.net_fee_cents, n: x.n + 1 });
  }
  const w = ["18%", "22%", "20%", "20%", "20%"];
  const cell = { fontSize: 8, paddingVertical: 3 };
  const doc = (
    <Document title={fmt(t.pdfTitle, { month })} author="Sellycat">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: "#111111", paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 32 }}>
          <View>
            <Text style={{ fontWeight: 700, fontSize: 12, color: "#FF4B23" }}>Sellycat</Text>
            <Text style={{ color: MUTED }}>sellycat.com</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {to.map((l, k) => (
              <Text key={k} style={{ fontWeight: k === 0 ? 600 : 400 }}>{l}</Text>
            ))}
          </View>
        </View>
        <Text style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{fmt(t.pdfTitle, { month })}</Text>
        <Text style={{ color: MUTED, marginBottom: 18 }}>{fmt(t.pdfIntro, { shop: i.shop.name, month })}</Text>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: "#111111", paddingBottom: 3 }} fixed>
          {[t.date, t.order, t.amount, t.refunded, t.net].map((h, k) => (
            <Text key={h} style={{ width: w[k], fontSize: 7.5, fontWeight: 600, textAlign: k >= 2 ? "right" : "left" }}>{h}</Text>
          ))}
        </View>
        {i.lines.map((l) => (
          <View key={l.number} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE }} wrap={false}>
            <Text style={{ ...cell, width: w[0] }}>{day(l.paid_at)}</Text>
            <Text style={{ ...cell, width: w[1] }}>{l.number}</Text>
            <Text style={{ ...cell, width: w[2], textAlign: "right" }}>{money(l.amount_cents, l.currency)}</Text>
            <Text style={{ ...cell, width: w[3], textAlign: "right" }}>{l.refunded_cents ? money(l.refunded_cents, l.currency) : "–"}</Text>
            <Text style={{ ...cell, width: w[4], textAlign: "right" }}>{money(l.net_fee_cents, l.currency)}</Text>
          </View>
        ))}
        {[...totals].map(([cur, x]) => (
          <View key={cur} style={{ flexDirection: "row", paddingTop: 5 }} wrap={false}>
            <Text style={{ width: "40%", fontWeight: 600 }}>{`${t.total} (${x.n} ${t.orders})`}</Text>
            <Text style={{ width: w[2], textAlign: "right", fontWeight: 600 }}>{money(x.amount, cur)}</Text>
            <Text style={{ width: w[3], textAlign: "right", fontWeight: 600 }}>{money(x.refunded, cur)}</Text>
            <Text style={{ width: w[4], textAlign: "right", fontWeight: 700 }}>{money(x.net, cur)}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 24, color: MUTED }}>{t.pdfNote}</Text>
        <Text
          style={{ position: "absolute", bottom: 28, left: 44, right: 44, fontSize: 7, color: MUTED, textAlign: "center" }}
          fixed
          render={({ pageNumber, totalPages }) => `Sellycat · ${fmt(t.pdfTitle, { month })} · ${pageNumber}/${totalPages}`}
        />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
