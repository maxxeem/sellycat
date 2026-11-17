import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildApplePass } from "./apple";
import { parseWalletDesign } from "./content";

// Signs a real pass with the local certificates (sellycat-keys); skipped where they are missing.
const haveKeys = existsSync("sellycat-keys/apple-pass-cert.pem") || Boolean(process.env.APPLE_PASS_CERT);

describe.skipIf(!haveKeys || !process.env.APPLE_PASS_TYPE_ID)("Apple pass", () => {
  it("builds a signed .pkpass with pass.json, icons, manifest and signature", async () => {
    const buf = await buildApplePass(
      { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", title: "2 Pizzas", partner: "Bella", code: "K7MQ-4XPA-92HD", codeFormat: "qr", barcodeType: null, link: "https://x.sellycat.com/v/Ab3dEf6hIj9kLm2nOp5qRs8t", status: "valid", valueCents: null, remainingCents: null, currency: "CHF", validUntil: null, terms: null, image: null, locations: [] },
      { id: "11111111-2222-3333-4444-555555555555", name: "City Deals", locale: "de", host: "x.sellycat.com", primary: "#4f46e5", logo: null, iconUrl: null },
      parseWalletDesign(null),
      "t".repeat(40),
    );
    expect(buf).not.toBeNull();
    if (process.env.PASS_OUT) (await import("node:fs")).writeFileSync(process.env.PASS_OUT, buf!);
    const text = buf!.toString("latin1");
    expect(buf!.subarray(0, 2).toString()).toBe("PK");
    for (const f of ["pass.json", "icon.png", "icon@2x.png", "manifest.json", "signature"]) expect(text).toContain(f);
  }, 30_000);
});
