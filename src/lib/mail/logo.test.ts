import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { boxLogo, mailLogoUrl } from "./logo";
import { MAIL_LOGO, dealAlertConfirmMail, myLinkMail, type MailBrand } from "./templates";

describe("mail logos are never distorted", () => {
  for (const [name, w, h] of [["very wide", 1600, 120], ["wide", 1000, 180], ["square", 400, 400], ["tall", 120, 600], ["tiny", 30, 10]] as const)
    it(`keeps the proportions of a ${name} logo`, async () => {
      const box = await boxLogo(await sharp({ create: { width: w, height: h, channels: 4, background: "#ff0000" } }).png().toBuffer());
      const meta = await sharp(box).metadata();
      expect([meta.width, meta.height]).toEqual([MAIL_LOGO.width * 2, MAIL_LOGO.height * 2]);
      const { info } = await sharp(box).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer({ resolveWithObject: true });
      expect(Math.abs(info.width / info.height / (w / h) - 1)).toBeLessThan(0.08);
    });

  it("is shown in exactly the size of the picture", () => {
    const brand: MailBrand = { shopName: "S", locale: "de", primary: "#ff4b23", logoUrl: mailLogoUrl("https://s.ch", "t", "https://x/logo.svg", "light"), shopUrl: "https://s.ch" };
    const imgs = [
      myLinkMail({ brand, url: "https://s.ch/my" }).html,
      dealAlertConfirmMail({ brand, band: { background: "#000000", text: "#ffffff", logoUrl: mailLogoUrl("https://s.ch", "t", "l", "band") }, url: "u" }).html,
    ].map((html) => /<img[^>]*logo\/t[^>]*>/.exec(html)![0]);
    for (const img of imgs) {
      expect(img).toContain(`width="${MAIL_LOGO.width}" height="${MAIL_LOGO.height}"`);
      expect(img).not.toContain("max-width");
    }
    expect(mailLogoUrl("https://s.ch", "t", null, "band")).toBeNull();
  });
});
