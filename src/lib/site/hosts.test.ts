import { describe, expect, it } from "vitest";
import { classifyHost, slugify, validateSlug } from "./hosts";

describe("classifyHost", () => {
  const root = "sellycat.com";
  it("treats apex and www as apex", () => {
    expect(classifyHost("sellycat.com", root)).toEqual({ kind: "apex" });
    expect(classifyHost("www.sellycat.com", root)).toEqual({ kind: "apex" });
    expect(classifyHost("SELLYCAT.com.", root)).toEqual({ kind: "apex" });
  });
  it("finds the shop slug on subdomains", () => {
    expect(classifyHost("pizza.sellycat.com", root)).toEqual({ kind: "shop-slug", slug: "pizza" });
    expect(classifyHost("pizza.localhost:3000", root)).toEqual({ kind: "shop-slug", slug: "pizza" });
  });
  it("ignores deeper names", () => {
    expect(classifyHost("a.b.sellycat.com", root)).toEqual({ kind: "apex" });
  });
  it("treats dev and preview hosts as apex", () => {
    expect(classifyHost("localhost:3000", root)).toEqual({ kind: "apex" });
    expect(classifyHost("sellycat-git-main.vercel.app", root)).toEqual({ kind: "apex" });
  });
  it("treats other hosts as custom shop domains", () => {
    expect(classifyHost("deals.kundenfirma.ch", root)).toEqual({ kind: "shop-domain", host: "deals.kundenfirma.ch" });
  });
  it("works with the staging root", () => {
    expect(classifyHost("staging.sellycat.com", "staging.sellycat.com")).toEqual({ kind: "apex" });
    expect(classifyHost("demo.staging.sellycat.com", "staging.sellycat.com")).toEqual({ kind: "shop-slug", slug: "demo" });
  });
});

describe("validateSlug", () => {
  it("accepts simple slugs", () => expect(validateSlug("pizza-roma")).toEqual({ ok: true }));
  it("rejects bad format", () => {
    expect(validateSlug("ab").ok).toBe(false);
    expect(validateSlug("-pizza").ok).toBe(false);
    expect(validateSlug("Pizza").ok).toBe(false);
    expect(validateSlug("a--b").ok).toBe(false);
  });
  it("rejects reserved names", () => expect(validateSlug("admin")).toEqual({ ok: false, reason: "reserved" }));
});

describe("slugify", () => {
  it("transliterates German umlauts", () => expect(slugify("Café Zürich AG")).toBe("cafe-zuerich-ag"));
  it("trims to 40 characters", () => expect(slugify("x".repeat(60)).length).toBe(40));
});
