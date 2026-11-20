import { describe, expect, it } from "vitest";
import { maskEmail } from "./access-rules";

describe("voucher access", () => {
  it("masks the owner's address", () => {
    expect(maskEmail("Jane.Doe@Gmail.com")).toBe("ja•••@gmail.com");
    expect(maskEmail("ab@x.ch")).toBe("a•••@x.ch");
    expect(maskEmail("nope")).toBe("•••");
  });
});
