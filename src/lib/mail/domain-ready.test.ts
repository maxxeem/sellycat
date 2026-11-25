import { describe, expect, it } from "vitest";
import { domainColumns } from "./domain-ready";
import type { DnsRecord } from "./mailgun";

const rec = (purpose: DnsRecord["purpose"], valid: boolean): DnsRecord => ({ type: purpose === "sending" ? "TXT" : "MX", name: "mail.example.ch", value: "x", valid, purpose });
const state = (s: "active" | "unverified", mxValid = false) => ({ ok: true as const, state: s, records: [rec("sending", true), rec("receiving", mxValid)] });

describe("domainColumns", () => {
  it("needs MX besides Mailgun's verification", () => {
    expect(domainColumns(state("active"), false, false).status).toBe("pending");
    expect(domainColumns(state("active"), true, false).status).toBe("active");
    expect(domainColumns(state("unverified"), true, false).status).toBe("pending");
  });
  it("takes a domain without MX out of use again", () => expect(domainColumns(state("active", true), false, true).status).toBe("pending"));
  it("accepts another provider's MX and shows the records as done", () => expect(domainColumns(state("active", false), true, false).records.every((r) => r.valid)).toBe(true));
  it("falls back to Mailgun's view when the DNS does not answer, without stopping a domain in use", () => {
    expect(domainColumns(state("active", true), null, false).status).toBe("active");
    expect(domainColumns(state("active", false), null, false).status).toBe("pending");
    expect(domainColumns(state("active", false), null, true).status).toBe("active");
  });
});
