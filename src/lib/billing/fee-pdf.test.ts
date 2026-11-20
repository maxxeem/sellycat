import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderFeePdf } from "./fee-pdf";

describe("fee overview PDF", () => {
  it("renders orders and totals per currency", async () => {
    const pdf = await renderFeePdf({
      shop: { name: "Santa Lucia (Demo)", billing: { legal_name: "Santa Lucia AG", street: "Bahnhofplatz 1", zip: "3011", city: "Bern" } },
      locale: "de",
      month: "2026-11",
      lines: [
        { number: "B009-E515", paid_at: "2026-11-17T20:15:00Z", currency: "CHF", amount_cents: 3200, refunded_cents: 0, fee_cents: 160, net_fee_cents: 160 },
        { number: "B00A-1234", paid_at: "2026-11-18T10:00:00Z", currency: "CHF", amount_cents: 4000, refunded_cents: 1000, fee_cents: 200, net_fee_cents: 150 },
      ],
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.PDF_OUT) await writeFile(`${process.env.PDF_OUT}/fees.pdf`, pdf);
  });
});
