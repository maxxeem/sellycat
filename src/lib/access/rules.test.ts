import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, codeLink, codeRequired, codeState, generateCode, isValidCode, botSignal, looksLikeBot, normaliseCode, normaliseWebsite, signupCta, waitlistSchema } from "./rules";

describe("signup modes", () => {
  it("maps each mode to its landing CTA", () => {
    expect(signupCta("paused")).toEqual({ kind: "waitlist", href: "/#warteliste" });
    expect(signupCta("invite")).toEqual({ kind: "code", href: "/signup" });
    expect(signupCta("open")).toEqual({ kind: "start", href: "/signup" });
  });
  it("asks for a code unless signup is open", () => {
    expect(codeRequired("open")).toBe(false);
    expect(codeRequired("invite")).toBe(true);
    expect(codeRequired("paused")).toBe(true);
  });
});

describe("invite codes", () => {
  it("normalises what people type", () => {
    expect(normaliseCode("  radio pfote_2026 ")).toBe("RADIO-PFOTE-2026");
    expect(normaliseCode("ab--cd!")).toBe("AB-CD");
    expect(normaliseCode("-x-")).toBe("X");
  });
  it("validates like the database", () => {
    expect(isValidCode("SOMMER-26")).toBe(true);
    expect(isValidCode("AB")).toBe(false);
    expect(isValidCode("A--B")).toBe(false);
    expect(isValidCode("x".repeat(41).toUpperCase())).toBe(false);
  });
  it("generates readable, valid codes without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[2-9A-Z]{5}-[2-9A-Z]{5}$/);
      expect(c).not.toMatch(/[01OIL]/);
      expect(isValidCode(c)).toBe(true);
    }
    expect(generateCode("Radio Pfote")).toMatch(/^RADIO-PFOTE-[2-9A-Z]{5}-[2-9A-Z]{5}$/);
  });
  it("skips biased bytes", () => {
    let call = 0;
    const random = (n: number) => (call++ === 0 ? new Uint8Array(n).fill(250) : new Uint8Array(n).fill(0));
    expect(generateCode("", random)).toBe(`${CODE_ALPHABET[0].repeat(5)}-${CODE_ALPHABET[0].repeat(5)}`);
  });
  it("derives the state", () => {
    const base = { disabled_at: null, expires_at: null, uses: 0, max_uses: 1 };
    expect(codeState(base)).toBe("active");
    expect(codeState({ ...base, uses: 1 })).toBe("used_up");
    expect(codeState({ ...base, max_uses: null, uses: 99 })).toBe("active");
    expect(codeState({ ...base, expires_at: "2020-01-01T00:00:00Z" })).toBe("expired");
    expect(codeState({ ...base, disabled_at: "2020-01-01T00:00:00Z", uses: 1 })).toBe("disabled");
  });
  it("builds the prefilled link", () => {
    expect(codeLink("https://sellycat.com/", "AB-CD")).toBe("https://sellycat.com/signup?code=AB-CD");
  });
});

describe("waitlist", () => {
  const base = { email: " Jan@Firma.CH ", name: "", company: "Radio Pfote", website: "firma.ch", useCase: "media", message: "", locale: "de", consent: "on" };
  it("accepts and cleans a valid entry", () => {
    const r = waitlistSchema.parse(base);
    expect(r).toMatchObject({ email: "jan@firma.ch", name: null, company: "Radio Pfote", website: "https://firma.ch", useCase: "media", message: null });
  });
  it("requires consent and a valid address", () => {
    expect(waitlistSchema.safeParse({ ...base, consent: "" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...base, useCase: "spam" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...base, useCase: "" }).data?.useCase).toBeNull();
  });
  it("normalises websites and rejects junk", () => {
    expect(normaliseWebsite("https://www.firma.ch/")).toBe("https://www.firma.ch");
    expect(normaliseWebsite("javascript:alert(1)")).toBeNull();
    expect(normaliseWebsite("localhost")).toBeNull();
    expect(normaliseWebsite("https://user:pw@firma.ch")).toBeNull();
  });
  it("spots bots", () => {
    const now = 1_000_000_000;
    expect(looksLikeBot({ honeypot: "", renderedAt: now - 10_000, now })).toBe(false);
    expect(looksLikeBot({ honeypot: "x", renderedAt: now - 10_000, now })).toBe(true);
    expect(botSignal({ honeypot: "", renderedAt: 0, now })).toBe("no-time");
    expect(botSignal({ honeypot: "", renderedAt: now - 1000, now })).toBe("too-fast");
    // A visitor clock running ahead is no bot signal.
    expect(botSignal({ honeypot: "", renderedAt: now + 30_000, now })).toBeNull();
    expect(looksLikeBot({ honeypot: "", renderedAt: now - 500, now })).toBe(true);
    expect(looksLikeBot({ honeypot: "", renderedAt: Number.NaN, now })).toBe(true);
  });
});
