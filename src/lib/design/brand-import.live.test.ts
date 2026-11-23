import { describe, expect, it } from "vitest";
import { importBranding } from "./brand-import";

// Calls the real website: BRAND_LIVE=<url> npx vitest run src/lib/design/brand-import.live.test.ts
describe.skipIf(!process.env.BRAND_LIVE)("branding import live", () => {
  it("suggests logo and colours for a real website", async () => {
    const r = await importBranding(process.env.BRAND_LIVE!);
    if (!r.ok) console.log("reason:", r.reason);
    expect(r.ok).toBe(true);
    if (r.ok) {
      console.log(JSON.stringify({ ...r.suggestion, partial: r.partial, files: Object.fromEntries(Object.entries(r.files).map(([k, f]) => [k, `${f.type} ${Math.round(f.data.length / 1024)} KB`])) }, null, 2));
      expect(r.files.logo).toBeDefined();
      expect(r.suggestion.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
    }
  }, 120_000);
});
