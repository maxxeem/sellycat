import { describe, expect, it } from "vitest";
import { isShopState, noticeTexts, parseNotice } from "./shop-state";

const defaults = { building: { title: "Hier entsteht ein neuer Shop", text: "Bald gibt es hier Deals." }, closed: { title: "Wir haben gerade geschlossen", text: "Schau bitte später wieder vorbei." } };

describe("shop state", () => {
  it("knows the three states", () => {
    expect(["building", "online", "closed"].every(isShopState)).toBe(true);
    expect(isShopState("open")).toBe(false);
  });

  it("uses the shop's own texts, else the defaults", () => {
    const t = noticeTexts({ closed_title: "Betriebsferien", closed_text: "  ", building_title: "ignored" } as never, defaults);
    expect(t.closed).toEqual({ title: "Betriebsferien", text: "Schau bitte später wieder vorbei." });
    expect(t.building).toEqual(defaults.building);
    expect(noticeTexts(null, defaults)).toEqual(defaults);
  });

  it("stores only the closed texts, trimmed and cut to length, empty as null", () => {
    const form: Record<string, string> = { building_title: "Neu", closed_title: "x".repeat(200), closed_text: "  Bis  bald " };
    const n = parseNotice((k) => form[k]);
    expect(n).toEqual({ closed_title: "x".repeat(80), closed_text: "Bis bald" });
    expect(parseNotice(() => "").closed_title).toBeNull();
  });
});
