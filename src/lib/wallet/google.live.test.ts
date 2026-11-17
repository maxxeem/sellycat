import { describe, expect, it } from "vitest";
import { parseWalletDesign } from "./content";
import { googleSaveUrl, updateGoogleObject } from "./google";

// Talks to the real Google Wallet API (creates the class of a test shop): WALLET_LIVE=1 only.
describe.skipIf(!process.env.WALLET_LIVE)("Google Wallet live", () => {
  const shop = { id: "00000000-0000-4000-8000-00000000test".replace("test", "0001"), name: "Sellycat Test", locale: "de" as const, host: "staging.sellycat.com", primary: "#ff4b23", logo: null };
  const v = { id: "00000000-0000-4000-8000-000000000002", title: "Testgutschein", partner: null, code: "TEST-0000-0001", codeFormat: "qr" as const, barcodeType: null, link: "https://staging.sellycat.com/v/SampleSampleSampleSample", status: "valid" as const, valueCents: null, remainingCents: null, currency: "CHF", validUntil: null, terms: null, image: null, locations: [] };

  it("creates the shop class and a signed save link", async () => {
    const save = await googleSaveUrl(v, shop, parseWalletDesign(null), ["https://staging.sellycat.com"]);
    if (process.env.SAVE_OUT) (await import("node:fs")).writeFileSync(process.env.SAVE_OUT, save!.url);
    expect(save?.url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/);
    const payload = JSON.parse(Buffer.from(save!.url.split("/").pop()!.split(".")[1], "base64url").toString());
    expect(payload).toMatchObject({ aud: "google", typ: "savetowallet", payload: { genericObjects: [{ id: save!.objectId, state: "ACTIVE" }] } });
  }, 30_000);

  it("reports a never-saved pass as missing", async () => {
    expect(await updateGoogleObject({ ...v, id: "00000000-0000-4000-8000-000000000999" }, shop, parseWalletDesign(null))).toBe("missing");
  }, 30_000);
});
