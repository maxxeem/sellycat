import { describe, expect, it } from "vitest";
import { importFromPage } from "./import-ai";

// Calls the real page and Claude (costs a few cents): IMPORT_LIVE=<url> npx vitest run src/lib/deals/import-ai.live.test.ts
describe.skipIf(!process.env.IMPORT_LIVE)("AI deal import live", () => {
  it("writes a draft from a real page", async () => {
    const r = await importFromPage(process.env.IMPORT_LIVE!, "de");
    if (!r.ok) console.log("error:", r.error);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const { images, ...text } = r.draft;
      console.log(JSON.stringify(text, null, 2).slice(0, 3000));
      console.log("images:", images.length, images.map((i) => `${Math.round(i.data.length / 1024)} KB · ${i.alt}`));
      expect(r.draft.title.length).toBeGreaterThan(5);
      expect(r.draft.title + r.draft.subtitle + JSON.stringify(r.draft.blocks)).not.toContain("ß");
    }
  }, 180_000);
});
