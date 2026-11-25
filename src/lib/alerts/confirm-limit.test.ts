import { describe, expect, it } from "vitest";
import { nextConfirmMail } from "./confirm-limit";

const now = Date.parse("2026-11-25T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("nextConfirmMail", () => {
  it("sends the first mail", () => expect(nextConfirmMail(null, 0, now)).toEqual({ kind: "send", count: 1 }));
  it("pauses for a minute", () => expect(nextConfirmMail(ago(30_000), 1, now)).toEqual({ kind: "recent" }));
  it("counts up to five, then says so", () => {
    expect(nextConfirmMail(ago(120_000), 4, now)).toEqual({ kind: "send", count: 5 });
    expect(nextConfirmMail(ago(120_000), 5, now)).toEqual({ kind: "limit" });
  });
  it("starts again after a day", () => expect(nextConfirmMail(ago(86_400_000), 5, now)).toEqual({ kind: "send", count: 1 }));
});
