import { describe, expect, it } from "vitest";
import { buildSender, displayName, isSubdomain, normaliseMailDomain } from "./sender";

const base = {
  shopName: "Velo Deals",
  fromName: null,
  replyTo: null,
  contactEmail: null,
  locale: "de" as const,
  platformDomain: "mail.sellycat.com",
  own: null,
  planAllowsOwn: true,
};

describe("buildSender", () => {
  it("sends via Sellycat in the shop's name by default", () => {
    expect(buildSender(base)).toEqual({ domain: "mail.sellycat.com", address: "gutscheine@mail.sellycat.com", from: '"Velo Deals" <gutscheine@mail.sellycat.com>', replyTo: null, own: false });
    expect(buildSender({ ...base, locale: "en" }).address).toBe("vouchers@mail.sellycat.com");
  });
  it("uses the shop's own domain only when verified and allowed by the plan", () => {
    const own = { domain: "mail.velo.ch", localPart: "deals", status: "active" };
    expect(buildSender({ ...base, own })).toMatchObject({ domain: "mail.velo.ch", address: "deals@mail.velo.ch", own: true });
    expect(buildSender({ ...base, own: { ...own, status: "pending" } }).domain).toBe("mail.sellycat.com");
    expect(buildSender({ ...base, own, planAllowsOwn: false }).domain).toBe("mail.sellycat.com");
  });
  it("prefers the sender name and a valid reply-to", () => {
    const s = buildSender({ ...base, fromName: 'Velo "Team" <x>', replyTo: "kein mail", contactEmail: "hallo@velo.ch" });
    expect(s.from).toBe('"Velo Team x" <gutscheine@mail.sellycat.com>');
    expect(s.replyTo).toBe("hallo@velo.ch");
  });
  it("cleans display names", () => {
    expect(displayName("A\r\nBcc: x@y.ch")).toBe("A Bcc: x@y.ch");
    expect(displayName("  ")).toBe("Sellycat");
  });
});

describe("normaliseMailDomain", () => {
  it("accepts domains and strips noise", () => {
    expect(normaliseMailDomain(" https://Mail.Velo.ch/ ")).toBe("mail.velo.ch");
    expect(isSubdomain("mail.velo.ch")).toBe(true);
    expect(isSubdomain("velo.ch")).toBe(false);
  });
  it("rejects invalid and Sellycat domains", () => {
    expect(normaliseMailDomain("velo")).toBeNull();
    expect(normaliseMailDomain("a b.ch")).toBeNull();
    expect(normaliseMailDomain("\u00a0deals.my105.ch\u200b ")).toBe("deals.my105.ch");
    expect(normaliseMailDomain("mail.sellycat.com")).toBeNull();
    expect(normaliseMailDomain("sellycat.com")).toBeNull();
  });
});
