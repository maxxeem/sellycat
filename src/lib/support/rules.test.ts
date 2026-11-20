import { describe, expect, it } from "vitest";
import { cleanText, isSupportCategory, isSupportStatus, ownAttachment } from "./rules";

const uid = "11111111-2222-3333-4444-555555555555";
const file = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("support rules", () => {
  it("knows categories and statuses", () => {
    expect(isSupportCategory("billing")).toBe(true);
    expect(isSupportCategory("spam")).toBe(false);
    expect(isSupportStatus("done")).toBe(true);
  });

  it("accepts attachments only from the uploader's own folder", () => {
    expect(ownAttachment(uid, { path: `${uid}/${file}.png`, name: "shot.png", bytes: 1200 })).toEqual({ path: `${uid}/${file}.png`, name: "shot.png", bytes: 1200 });
    expect(ownAttachment(uid, { path: `99999999-2222-3333-4444-555555555555/${file}.png`, name: "x" , bytes: 1 })).toBeNull();
    expect(ownAttachment(uid, { path: `${uid}/../${file}.png` })).toBeNull();
    expect(ownAttachment(uid, { path: `${uid}/${file}.exe` })).toBeNull();
    expect(ownAttachment(uid, null)).toBeNull();
  });

  it("cleans text", () => {
    expect(cleanText("  hi\r\nthere  ", 100)).toBe("hi\nthere");
    expect(cleanText("abcdef", 3)).toBe("abc");
  });
});
