import { describe, expect, it } from "vitest";
import { recordName } from "./record-name";

describe("recordName", () => {
  it("MX without a name belongs to the sender domain", () => {
    expect(recordName("", "mail.my105.ch")).toEqual({ host: "mail", full: "mail.my105.ch" });
  });
  it("names relative to the main domain", () => {
    expect(recordName("krs._domainkey.mail.my105.ch", "mail.my105.ch")).toEqual({ host: "krs._domainkey.mail", full: "krs._domainkey.mail.my105.ch" });
    expect(recordName("email.mail.example.co.uk.", "mail.example.co.uk")).toEqual({ host: "email.mail", full: "email.mail.example.co.uk" });
  });
  it("@ for the main domain itself", () => {
    expect(recordName("", "my105.ch")).toEqual({ host: "@", full: "my105.ch" });
  });
});
