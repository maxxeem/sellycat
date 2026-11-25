import { describe, expect, it } from "vitest";
import { authMail, dealAlertActiveMail, dealAlertConfirmMail, dealAlertMail, esc, giftMail, myLinkMail, orderMail, waitlistTeamMail, type MailBrand } from "./templates";

const brand: MailBrand = { shopName: "Velo <Deals>", locale: "de", primary: "#ff4b23", logoUrl: "https://x.supabase.co/logo.svg", shopUrl: "https://velo.sellycat.com" };
const v = { title: "Service-Paket", partner: "Velo Huber", code: "ABCD-EFGH-JKMN", valueCents: 5000, currency: "CHF", validUntil: "2027-06-30T21:59:59Z", link: "https://velo.sellycat.com/v/tok" };

describe("mail templates", () => {
  it("escapes HTML", () => {
    expect(esc(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  });
  it("order mail lists the vouchers, escapes the shop name and skips SVG logos", () => {
    const m = orderMail({ brand, number: "8F3A-21C9", orderUrl: "https://velo.sellycat.com/order/1?session_id=cs", myUrl: "https://velo.sellycat.com/my", vouchers: [v], gift: null });
    expect(m.subject).toBe("Deine Gutscheine von Velo <Deals>");
    expect(m.html).toContain("Velo &lt;Deals&gt;");
    expect(m.html).not.toContain("<Deals>");
    expect(m.html).toContain("ABCD-EFGH-JKMN");
    expect(m.html).not.toContain("logo.svg");
    expect(m.text).toContain("ABCD-EFGH-JKMN");
    expect(m.text).toContain("30. Juni 2027");
  });
  it("order mail mentions a scheduled gift", () => {
    const m = orderMail({ brand, number: "1", orderUrl: "u", myUrl: "m", vouchers: [v], gift: { email: "anna@example.ch", sendOn: "2026-12-24", sent: false } });
    expect(m.subject).toContain("Bestellung 1");
    expect(m.text).toContain("24. Dezember 2026");
    expect(m.text).toContain("anna@example.ch");
  });
  it("gift mail shows the message and per-voucher links", () => {
    const m = giftMail({ brand: { ...brand, locale: "en" }, from: "Jan", name: "Anna", message: "Happy birthday!\n<3", vouchers: [v], myUrl: "https://velo.sellycat.com/my" });
    expect(m.subject).toBe("Jan sent you a voucher");
    expect(m.html).toContain("Happy birthday!\n&lt;3");
    expect(m.html).toContain("https://velo.sellycat.com/v/tok");
    expect(giftMail({ brand, from: null, name: null, message: null, vouchers: [v], myUrl: "m" }).subject).toBe("Ein Gutschein für dich von Velo <Deals>");
  });
  it("keeps subjects on one line", () => {
    expect(giftMail({ brand, from: "Eve\r\nBcc: x", name: null, message: null, vouchers: [v], myUrl: "m" }).subject).not.toMatch(/[\r\n]/);
  });
  it("my-link mail carries the link", () => {
    expect(myLinkMail({ brand, url: "https://velo.sellycat.com/my/abc" }).html).toContain("https://velo.sellycat.com/my/abc");
  });
});

describe("waitlistTeamMail", () => {
  it("names the entry, escapes input and links to the staff page", () => {
    const m = waitlistTeamMail({ brand, email: "a@b.ch", name: null, company: "<Kino> AG", useCase: "Agentur", locale: "de", url: "https://sellycat.com/login?next=x" });
    expect(m.subject).toContain("<Kino> AG");
    expect(m.html).toContain("&lt;Kino&gt; AG");
    expect(m.html).not.toContain("<Kino>");
    expect(m.text).toContain("E-Mail: a@b.ch");
    expect(m.text).toContain("Name: –");
    expect(m.text).toContain("https://sellycat.com/login?next=x");
  });
  it("deal alert mail shows price, saving, deal link and the way out", () => {
    const band = { background: "#180f26", text: "#ffffff", logoUrl: null };
    const deal = { title: "Sonos <Roam>", subtitle: null, priceCents: 14900, compareAtCents: 19900, currency: "CHF", image: null, left: 10, url: "https://velo.sellycat.com/d/sonos" };
    const m = dealAlertMail({ brand, band, deal, unsubscribeUrl: "https://velo.sellycat.com/alert/off/tok" });
    expect(m.subject).toMatch(/^Neuer Deal: Sonos <Roam> für CHF.149$/);
    expect(m.html).toContain("Sonos &lt;Roam&gt;");
    expect(m.html).toContain("-25%");
    expect(m.html).toContain("10 Stück verfügbar");
    expect(m.html).toContain("https://velo.sellycat.com/d/sonos");
    expect(m.html).toContain("https://velo.sellycat.com/alert/off/tok");
    expect(m.text).toContain("https://velo.sellycat.com/alert/off/tok");
    const plain = dealAlertMail({ brand, band, deal: { ...deal, compareAtCents: null, left: null }, unsubscribeUrl: "u" });
    expect(plain.html).not.toContain("<s ");
    expect(plain.html).not.toContain("verfügbar");
    const active = dealAlertActiveMail({ brand, band, unsubscribeUrl: "https://velo.sellycat.com/alert/off/tok" });
    expect(active.html).toContain("/alert/off/tok");
    expect(active.text).toContain("Velo <Deals>");
    expect(dealAlertConfirmMail({ brand, band, url: "https://velo.sellycat.com/alert/confirm/tok" }).html).toContain("/alert/confirm/tok");
  });
});

describe("authMail", () => {
  it("carries the link and Sellycat's own footer, not the waitlist one", () => {
    for (const kind of ["confirm", "reconfirm", "recovery", "invite"] as const) {
      const m = authMail({ kind, brand, url: "https://sellycat.com/auth/continue?token_hash=abc&type=magiclink" });
      expect(m.text).toContain("token_hash=abc&type=magiclink");
      expect(m.html).toContain("token_hash=abc&amp;type=magiclink");
      expect(m.text).not.toContain("Warteliste");
    }
  });
});
