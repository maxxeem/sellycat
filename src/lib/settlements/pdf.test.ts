import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderSettlementPdf } from "./pdf";

describe("settlement PDF", () => {
  it("renders a statement with lines, totals and the IBAN", async () => {
    const line = (i: number, kind: "sale" | "redemption" | "correction", base: number) => ({
      id: `l${i}`, kind, deal_title: "20 CHF Pizza-Guthaben für Santa Lucia Teatro", code: `W2Z5-FG88-XRD${i}`, occurred_at: "2026-11-17T21:30:00Z",
      base_cents: base, commission_cents: Math.round(base * 0.2), payout_cents: base - Math.round(base * 0.2),
    });
    const lines = [line(1, "sale", 1000), line(2, "redemption", 1000), line(3, "correction", -1000)];
    const pdf = await renderSettlementPdf({
      shop: { name: "Santa Lucia (Demo)", locale: "de", billing: { legal_name: "Santa Lucia AG", street: "Bahnhofplatz 1", zip: "3011", city: "Bern", vat_no: "CHE-123.456.789" } },
      settlement: {
        id: "s", number: 7, status: "final", partner_id: "p", period_from: "2026-11-01", period_to: "2026-11-30", currency: "CHF",
        base_cents: 1000, commission_cents: 200, payout_cents: 800,
        partner: { name: "Santa Lucia Restaurants", email: "x@example.com", billing: { street: "Weg 2", zip: "3000", city: "Bern", iban: "CH93 0076 2011 6238 5295 7" } },
        created_at: "2026-12-01T08:00:00Z", finalized_at: "2026-12-01T08:00:00Z", paid_at: null, sent_at: null,
      },
      lines,
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.PDF_OUT) await writeFile(`${process.env.PDF_OUT}/settlement.pdf`, pdf);
  });
});
