import { fmt, getDictionary } from "@/lib/i18n";
import { readableOn } from "@/lib/design/color";
import { formatMoney } from "@/lib/shop/deal-status";

/**
 * Buyer-facing mails in the shop's language and colours. Pure (data in, subject/HTML/text out),
 * table layout with inline styles for mail clients.
 */
export type MailBrand = { shopName: string; locale: "de" | "en"; primary: string; logoUrl: string | null; shopUrl: string };
export type MailVoucher = { title: string; partner: string | null; code: string; valueCents: number | null; currency: string; validUntil: string | null; link: string | null };
export type Mail = { subject: string; html: string; text: string };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** No line breaks in a subject (header injection) and a sane length. */
const subjectLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim().slice(0, 180);

const dateText = (iso: string, locale: "de" | "en") =>
  new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

/** Mail clients render PNG/JPEG reliably; SVG logos are left out. */
const mailImage = (url: string | null) => (url && /^https:\/\//.test(url) && !/\.svg(\?|$)/i.test(url) ? url : null);

function layout(brand: MailBrand, body: string, footer: string) {
  const logo = mailImage(brand.logoUrl);
  return `<!doctype html><html lang="${brand.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(brand.shopName)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="height:6px;background:${brand.primary};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px;">${logo ? `<img src="${esc(logo)}" alt="${esc(brand.shopName)}" height="40" style="display:block;height:40px;max-width:200px;border:0;">` : `<p style="margin:0;font-size:18px;font-weight:700;">${esc(brand.shopName)}</p>`}</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:16px;line-height:1.5;">${body}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a;">${footer}</p>
</td></tr></table></body></html>`;
}

function button(brand: MailBrand, href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:999px;background:${brand.primary};"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-weight:700;font-size:16px;color:${readableOn(brand.primary)};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}

function voucherRows(brand: MailBrand, vouchers: MailVoucher[], withLinks: boolean) {
  const t = getDictionary(brand.locale);
  return vouchers
    .map((v) => {
      const meta = [
        v.valueCents ? `${t.mail.value}: ${formatMoney(v.valueCents, v.currency, brand.locale)}` : null,
        v.validUntil ? fmt(t.shop.voucherValidUntil, { date: dateText(v.validUntil, brand.locale) }) : t.shop.voucherNoExpiry,
      ].filter(Boolean);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid #e4e4e7;border-radius:12px;"><tr><td style="padding:16px;">
${v.partner ? `<p style="margin:0 0 2px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#71717a;">${esc(v.partner)}</p>` : ""}
<p style="margin:0;font-weight:700;">${esc(v.title)}</p>
<p style="margin:8px 0 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:.06em;">${esc(v.code)}</p>
<p style="margin:6px 0 0;font-size:13px;color:#52525b;">${meta.map((m) => esc(m!)).join(" · ")}</p>
${withLinks && v.link ? `<p style="margin:10px 0 0;font-size:14px;"><a href="${esc(v.link)}" style="color:#111111;font-weight:700;">${esc(t.mail.openVoucher)} &rarr;</a></p>` : ""}
</td></tr></table>`;
    })
    .join("");
}

function voucherText(brand: MailBrand, vouchers: MailVoucher[]) {
  const t = getDictionary(brand.locale);
  return vouchers
    .map((v) => {
      const valid = v.validUntil ? fmt(t.shop.voucherValidUntil, { date: dateText(v.validUntil, brand.locale) }) : t.shop.voucherNoExpiry;
      return `- ${v.title}${v.partner ? ` (${v.partner})` : ""}: ${v.code}${v.valueCents ? `, ${formatMoney(v.valueCents, v.currency, brand.locale)}` : ""} · ${valid}${v.link ? `\n  ${v.link}` : ""}`;
    })
    .join("\n");
}

/** To the buyer, right after payment (PDF attached). */
export function orderMail(i: {
  brand: MailBrand;
  number: string;
  orderUrl: string;
  myUrl: string;
  vouchers: MailVoucher[];
  gift: { email: string; sendOn: string | null; sent: boolean } | null;
}): Mail {
  const t = getDictionary(i.brand.locale);
  const m = t.mail;
  const giftLine = i.gift
    ? i.gift.sent || !i.gift.sendOn
      ? fmt(t.shop.giftSentTo, { email: i.gift.email })
      : fmt(t.shop.giftScheduled, { email: i.gift.email, date: dateText(`${i.gift.sendOn}T12:00:00Z`, i.brand.locale) })
    : null;
  const subject = subjectLine(i.gift ? fmt(m.orderGiftSubject, { number: i.number, shop: i.brand.shopName }) : fmt(m.orderSubject, { shop: i.brand.shopName }));
  const footer = `${esc(fmt(t.shop.orderNumber, { number: i.number }))} · ${esc(fmt(m.footer, { shop: i.brand.shopName }))}`;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(m.orderHeading)}</h1>
<p style="margin:0;">${esc(i.gift ? m.orderGiftIntro : m.orderIntro)}</p>
${giftLine ? `<p style="margin:12px 0 0;padding:12px 14px;background:#f4f4f5;border-radius:10px;">🎁 ${esc(giftLine)}</p>` : ""}
${voucherRows(i.brand, i.vouchers, false)}
${button(i.brand, i.orderUrl, m.viewOrder)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(m.myHint)} <a href="${esc(i.myUrl)}" style="color:#111111;">${esc(t.shop.myVouchers)}</a></p>`,
    footer,
  );
  const text = [m.orderHeading, "", i.gift ? m.orderGiftIntro : m.orderIntro, giftLine ?? "", "", voucherText(i.brand, i.vouchers), "", `${m.viewOrder}: ${i.orderUrl}`, `${t.shop.myVouchers}: ${i.myUrl}`, "", fmt(t.shop.orderNumber, { number: i.number }), fmt(m.footer, { shop: i.brand.shopName })]
    .filter((l, n, a) => !(l === "" && a[n - 1] === ""))
    .join("\n");
  return { subject, html, text };
}

/** To the gift recipient (PDF attached). */
export function giftMail(i: { brand: MailBrand; from: string | null; name: string | null; message: string | null; vouchers: MailVoucher[]; myUrl: string }): Mail {
  const t = getDictionary(i.brand.locale);
  const m = t.mail;
  const from = i.from?.trim() || null;
  const subject = subjectLine(from ? fmt(m.giftSubject, { from }) : fmt(m.giftSubjectAnon, { shop: i.brand.shopName }));
  const intro = from ? fmt(m.giftIntro, { from, shop: i.brand.shopName }) : fmt(m.giftIntroAnon, { shop: i.brand.shopName });
  const hello = i.name?.trim() ? `${i.brand.locale === "de" ? "Hallo" : "Hi"} ${i.name.trim()},` : null;
  const message = i.message?.trim() || null;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">🎁 ${esc(m.giftHeading)}</h1>
${hello ? `<p style="margin:0 0 8px;">${esc(hello)}</p>` : ""}
<p style="margin:0;">${esc(intro)}</p>
${message ? `<blockquote style="margin:16px 0 0;padding:14px 16px;border-left:4px solid ${i.brand.primary};background:#fafafa;border-radius:0 10px 10px 0;font-style:italic;white-space:pre-line;">${esc(message)}</blockquote>` : ""}
${voucherRows(i.brand, i.vouchers, true)}
<p style="margin:16px 0 0;font-size:14px;color:#52525b;">${esc(m.pdfAttached)} ${esc(m.myHint)} <a href="${esc(i.myUrl)}" style="color:#111111;">${esc(t.shop.myVouchers)}</a></p>`,
    esc(fmt(m.footer, { shop: i.brand.shopName })),
  );
  const text = [m.giftHeading, "", hello ?? "", intro, message ? `\n"${message}"\n` : "", voucherText(i.brand, i.vouchers), "", m.pdfAttached, `${t.shop.myVouchers}: ${i.myUrl}`, "", fmt(m.footer, { shop: i.brand.shopName })]
    .filter((l, n, a) => !(l === "" && a[n - 1] === ""))
    .join("\n");
  return { subject, html, text };
}

/** "My vouchers" sign-in link. */
export function myLinkMail(i: { brand: MailBrand; url: string }): Mail {
  const t = getDictionary(i.brand.locale);
  const m = t.mail;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(t.shop.myVouchers)}</h1>
<p style="margin:0;">${esc(m.myLinkIntro)}</p>
${button(i.brand, i.url, m.myLinkButton)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(m.myLinkIgnore)}</p>`,
    esc(fmt(m.footer, { shop: i.brand.shopName })),
  );
  return {
    subject: subjectLine(fmt(m.myLinkSubject, { shop: i.brand.shopName })),
    html,
    text: [t.shop.myVouchers, "", m.myLinkIntro, "", i.url, "", m.myLinkIgnore].join("\n"),
  };
}
