import { describe, expect, it } from "vitest";
import { dnsRows, parseCustomDomain, providerFromNs } from "./custom-domain";

describe("parseCustomDomain", () => {
  const p = (s: string) => parseCustomDomain(s, "sellycat.com");
  it("cleans up what people paste", () => {
    expect(p(" https://Deals.Firma.ch/angebote?x=1 ")).toEqual({ ok: true, domain: { host: "deals.firma.ch", apex: "firma.ch", sub: "deals" } });
    expect(p("firma.ch.")).toEqual({ ok: true, domain: { host: "firma.ch", apex: "firma.ch", sub: null } });
    expect(p("shop.firma.co.uk")).toEqual({ ok: true, domain: { host: "shop.firma.co.uk", apex: "firma.co.uk", sub: "shop" } });
    expect(p("a.b.firma.ch")).toMatchObject({ ok: true, domain: { apex: "firma.ch", sub: "a.b" } });
  });
  it("rejects invalid input and the platform's own hosts", () => {
    for (const bad of ["firma", "-x.ch", "fi rma.ch", "co.uk", "x.123", ""]) expect(p(bad)).toEqual({ ok: false, error: "invalid" });
    for (const own of ["sellycat.com", "shop.sellycat.com", "x.staging.sellycat.com", "x.vercel.app"]) expect(p(own)).toEqual({ ok: false, error: "platform" });
  });
});

describe("dnsRows", () => {
  const opts = { cname: "cname.vercel-dns.com", ipv4: ["216.150.1.1", "216.150.16.1"], www: true, verification: [] };
  it("subdomain: one CNAME", () => {
    const d = parseCustomDomain("deals.firma.ch", "sellycat.com");
    if (!d.ok) throw new Error();
    expect(dnsRows(d.domain, opts)).toEqual([{ type: "CNAME", name: "deals", value: "cname.vercel-dns.com", purpose: "route" }]);
  });
  it("apex: A record plus www, and Vercel's TXT check relative to the apex", () => {
    const d = parseCustomDomain("firma.ch", "sellycat.com");
    if (!d.ok) throw new Error();
    expect(dnsRows(d.domain, { ...opts, verification: [{ type: "TXT", domain: "_vercel.firma.ch", value: "vc-domain-verify=firma.ch,abc" }] })).toEqual([
      { type: "A", name: "@", value: "216.150.1.1", purpose: "route" },
      { type: "A", name: "@", value: "216.150.16.1", purpose: "route" },
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com", purpose: "www" },
      { type: "TXT", name: "_vercel", value: "vc-domain-verify=firma.ch,abc", purpose: "verify" },
    ]);
  });
});

describe("providerFromNs", () => {
  it("knows the usual Swiss providers", () => {
    expect(providerFromNs(["ns51.domaincontrol.com"])).toBe("godaddy");
    expect(providerFromNs(["ns11.infomaniak.ch"])).toBe("infomaniak");
    expect(providerFromNs(["ns1.hostpoint.ch"])).toBe("hostpoint");
    expect(providerFromNs(["kara.ns.cloudflare.com"])).toBe("cloudflare");
    expect(providerFromNs(["ns1.example.net"])).toBe("other");
  });
});
