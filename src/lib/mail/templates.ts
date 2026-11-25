import { fmt, getDictionary } from "@/lib/i18n";
import { readableOn } from "@/lib/design/color";
import { formatMoney, savingsPercent } from "@/lib/shop/deal-status";

/**
 * Buyer-facing mails in the shop's language and colours. Pure (data in, subject/HTML/text out),
 * table layout with inline styles for mail clients.
 */
export type MailBrand = { shopName: string; locale: "de" | "en"; primary: string; logoUrl: string | null; /** Only for a logo that is not a MAIL_LOGO picture. */ logoSize?: { width: number; height: number }; shopUrl: string; /** Sent from the shop's own domain: no mention of Sellycat. */ ownSender?: boolean };
export type MailVoucher = { title: string; partner: string | null; code: string; valueCents: number | null; currency: string; validUntil: string | null; link: string | null; wallet?: { apple?: string; google?: string } };
export type Mail = { subject: string; html: string; text: string };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** No line breaks in a subject (header injection) and a sane length. */
const subjectLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim().slice(0, 180);

const dateText = (iso: string, locale: "de" | "en") =>
  new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

/** Shop logos in mails come as a picture of exactly this size with the whole logo inside (see logo.ts). */
export const MAIL_LOGO = { width: 220, height: 40 };
/** Fixed width and height, no max-width: clients would squash a wide logo. `size` must have the picture's proportions. */
const logoImg = (url: string, alt: string, size: { width: number; height: number }, extra = "") =>
  `<img src="${esc(url)}" alt="${esc(alt)}" width="${size.width}" height="${size.height}" style="display:block;width:${size.width}px;height:${size.height}px;border:0;${extra}">`;

/** Mail clients render PNG/JPEG reliably; SVG logos are left out. */
const mailImage = (url: string | null) => (url && /^https:\/\//.test(url) && !/\.svg(\?|$)/i.test(url) ? url : null);

/** "Sent on behalf of … via Sellycat": only when the sender address is Sellycat's. */
const viaSellycat = (brand: MailBrand) => (brand.ownSender ? "" : fmt(getDictionary(brand.locale).mail.footer, { shop: brand.shopName }));

function layout(brand: MailBrand, body: string, footer: string) {
  const logo = mailImage(brand.logoUrl);
  return `<!doctype html><html lang="${brand.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(brand.shopName)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="height:6px;background:${brand.primary};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px;">${logo ? logoImg(logo, brand.shopName, brand.logoSize ?? MAIL_LOGO) : `<p style="margin:0;font-size:18px;font-weight:700;">${esc(brand.shopName)}</p>`}</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:16px;line-height:1.5;">${body}</td></tr>
</table>
${footer ? `<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a;">${footer}</p>` : ""}
</td></tr></table></body></html>`;
}

function button(brand: MailBrand, href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:999px;background:${brand.primary};"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-weight:700;font-size:16px;color:${readableOn(brand.primary)};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}

/** Apple / Google Wallet side by side, one line each, with a PNG icon (mail clients show no SVG). */
function walletRow(brand: MailBrand, v: MailVoucher) {
  if (!v.wallet?.apple && !v.wallet?.google) return "";
  const t = getDictionary(brand.locale);
  const cell = (href: string, icon: string, label: string) =>
    `<td style="padding:0 8px 8px 0;"><a href="${esc(href)}" style="display:inline-block;padding:9px 14px;background:#000000;color:#ffffff;border-radius:10px;font-weight:700;font-size:14px;line-height:20px;text-decoration:none;white-space:nowrap;"><img src="${esc(`${brand.shopUrl}/mail/${icon}.png`)}" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;border:0;margin:-2px 8px 0 0;">${esc(label)}</a></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 0;"><tr>${v.wallet.apple ? cell(v.wallet.apple, "apple-wallet", "Apple Wallet") : ""}${v.wallet.google ? cell(v.wallet.google, "google-wallet", "Google Wallet") : ""}</tr></table>${t.wallet.mailHint ? `<p style="margin:2px 0 0;font-size:12px;color:#71717a;">${esc(t.wallet.mailHint)}</p>` : ""}`;
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
${walletRow(brand, v)}
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
  const footer = [fmt(t.shop.orderNumber, { number: i.number }), viaSellycat(i.brand)].filter(Boolean).map(esc).join(" · ");
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
  const text = [m.orderHeading, "", i.gift ? m.orderGiftIntro : m.orderIntro, giftLine ?? "", "", voucherText(i.brand, i.vouchers), "", `${m.viewOrder}: ${i.orderUrl}`, `${t.shop.myVouchers}: ${i.myUrl}`, "", fmt(t.shop.orderNumber, { number: i.number }), viaSellycat(i.brand)]
    .filter((l, n, a) => !(l === "" && a[n - 1] === ""))
    .join("\n")
    .trim();
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
    esc(viaSellycat(i.brand)),
  );
  const text = [m.giftHeading, "", hello ?? "", intro, message ? `\n"${message}"\n` : "", voucherText(i.brand, i.vouchers), "", m.pdfAttached, `${t.shop.myVouchers}: ${i.myUrl}`, "", viaSellycat(i.brand)]
    .filter((l, n, a) => !(l === "" && a[n - 1] === ""))
    .join("\n")
    .trim();
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
    esc(viaSellycat(i.brand)),
  );
  return {
    subject: subjectLine(fmt(m.myLinkSubject, { shop: i.brand.shopName })),
    html,
    text: [t.shop.myVouchers, "", m.myLinkIntro, "", i.url, "", m.myLinkIgnore].join("\n"),
  };
}

/** Six-digit sign-in code for the redemption app on the shop domain. */
export function redeemCodeMail(i: { brand: MailBrand; code: string; minutes: number }): Mail {
  const t = getDictionary(i.brand.locale);
  const r = t.redeem;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(r.mailHeading)}</h1>
<p style="margin:0;">${esc(fmt(r.mailIntro, { shop: i.brand.shopName }))}</p>
<p style="margin:20px 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:.3em;">${esc(i.code)}</p>
<p style="margin:0;font-size:14px;color:#52525b;">${esc(fmt(r.mailValid, { minutes: String(i.minutes) }))} ${esc(r.mailIgnore)}</p>`,
    esc(viaSellycat(i.brand)),
  );
  return {
    subject: subjectLine(fmt(r.mailSubject, { code: i.code, shop: i.brand.shopName })),
    html,
    text: [r.mailHeading, "", fmt(r.mailIntro, { shop: i.brand.shopName }), "", i.code, "", fmt(r.mailValid, { minutes: String(i.minutes) }), r.mailIgnore].join("\n"),
  };
}

/** A few days before a voucher expires. */
export function expiryMail(i: { brand: MailBrand; vouchers: MailVoucher[]; validUntil: string; url: string }): Mail {
  const t = getDictionary(i.brand.locale);
  const w = t.wallet;
  const date = dateText(i.validUntil, i.brand.locale);
  const intro = fmt(w.reminderIntro, { date });
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">⏳ ${esc(w.reminderHeading)}</h1>
<p style="margin:0;">${esc(intro)}</p>
${voucherRows(i.brand, i.vouchers, false)}
${button(i.brand, i.url, w.reminderButton)}`,
    esc(viaSellycat(i.brand)),
  );
  return {
    subject: subjectLine(fmt(w.reminderSubject, { shop: i.brand.shopName })),
    html,
    text: [w.reminderHeading, "", intro, "", voucherText(i.brand, i.vouchers), "", `${w.reminderButton}: ${i.url}`, "", viaSellycat(i.brand)].join("\n").trim(),
  };
}

/** Invitation for an authorised scanner of a partner (sign-in by code on the shop's /scan). */
export function scannerInviteMail(i: { brand: MailBrand; name: string; partner: string; url: string }): Mail {
  const t = getDictionary(i.brand.locale);
  const s = t.scanners;
  const hello = fmt(s.mailHello, { name: i.name });
  const intro = fmt(s.mailIntro, { shop: i.brand.shopName, partner: i.partner });
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(s.mailHeading)}</h1>
<p style="margin:0 0 8px;">${esc(hello)}</p>
<p style="margin:0;">${esc(intro)}</p>
${button(i.brand, i.url, s.mailButton)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(s.mailHow)}</p>`,
    esc(viaSellycat(i.brand)),
  );
  return {
    subject: subjectLine(fmt(s.mailSubject, { shop: i.brand.shopName })),
    html,
    text: [s.mailHeading, "", hello, intro, "", `${s.mailButton}: ${i.url}`, "", s.mailHow].join("\n"),
  };
}

/** Invitation into a shop's team (dashboard access on sellycat.com). */
export function teamInviteMail(i: { brand: MailBrand; name: string; inviter: string; role: "owner" | "admin" | "editor" | "redeemer"; url: string; days: number }): Mail {
  const t = getDictionary(i.brand.locale);
  const m = t.team.mail;
  const role = t.team.roles[i.role];
  const hello = i.name ? fmt(m.hello, { name: i.name }) : m.helloAnon;
  const intro = fmt(i.inviter ? m.intro : m.introAnon, { inviter: i.inviter, shop: i.brand.shopName, role });
  const valid = fmt(m.valid, { days: i.days });
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(fmt(m.heading, { shop: i.brand.shopName }))}</h1>
<p style="margin:0 0 8px;">${esc(hello)}</p>
<p style="margin:0;">${esc(intro)}</p>
${button(i.brand, i.url, m.button)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(valid)}</p>`,
    esc(viaSellycat(i.brand)),
  );
  return {
    subject: subjectLine(fmt(m.subject, { shop: i.brand.shopName })),
    html,
    text: [fmt(m.heading, { shop: i.brand.shopName }), "", hello, intro, "", `${m.button}: ${i.url}`, "", valid].join("\n"),
  };
}

/** Sellycat itself as the sender (support mails, not shop mails). */
export function platformBrand(locale: "de" | "en", siteUrl: string): MailBrand {
  return { shopName: "Sellycat", locale, primary: "#FF4B23", logoUrl: `${siteUrl}/brand/sellycat-on-light-1024.png`, logoSize: { width: 155, height: 40 }, shopUrl: siteUrl };
}

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

/** To the support team: a new request or a follow-up (always German, internal). */
export function supportTeamMail(i: { brand: MailBrand; number: number; subject: string; reply: boolean; name: string; email: string; shop: string; plan: string; category: string; message: string; url: string }): Mail {
  const head = `${i.reply ? "Neue Nachricht zu" : "Neue Support-Anfrage"} #${i.number}: ${i.subject}`;
  const meta = `${i.name} (${i.email}) · ${i.shop || "–"} · Plan ${i.plan} · ${i.category}`;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;">${esc(head)}</h1>
<p style="margin:0 0 16px;font-size:14px;color:#52525b;">${esc(meta)}</p>
${paragraphs(i.message)}
${button(i.brand, i.url, "Im Staff-Dashboard öffnen")}`,
    "Sellycat Support",
  );
  return { subject: subjectLine(head), html, text: [head, meta, "", i.message, "", i.url].join("\n") };
}

/** To the customer: our answer, with the way back to the thread in the dashboard. */
export function supportReplyMail(i: { brand: MailBrand; number: number; subject: string; name: string; message: string; url: string }): Mail {
  const s = getDictionary(i.brand.locale).support.mail;
  const hello = i.name ? fmt(s.hello, { name: i.name }) : s.helloAnon;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;">${esc(fmt(s.heading, { number: i.number }))}</h1>
<p style="margin:0 0 16px;font-size:14px;color:#52525b;">${esc(i.subject)}</p>
<p style="margin:0 0 12px;">${esc(hello)}</p>
${paragraphs(i.message)}
${button(i.brand, i.url, s.button)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(s.signature)}</p>`,
    esc(s.footer),
  );
  return {
    subject: subjectLine(fmt(s.subject, { number: i.number, subject: i.subject })),
    html,
    text: [fmt(s.heading, { number: i.number }), i.subject, "", hello, "", i.message, "", `${s.button}: ${i.url}`, "", s.signature].join("\n"),
  };
}

// ---------------------------------------------------------------- waitlist (Sellycat as sender)

function accessMail(i: { brand: MailBrand; subject: string; heading: string; name: string | null; text: string; button: { href: string; label: string }; extraHtml?: string; extraText?: string; after?: string; footer?: string }): Mail {
  const a = getDictionary(i.brand.locale).access.mail;
  const hello = i.name ? fmt(a.hello, { name: i.name }) : a.helloAnon;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${esc(i.heading)}</h1>
<p style="margin:0 0 12px;">${esc(hello)},</p>
<p style="margin:0 0 12px;">${esc(i.text)}</p>
${i.extraHtml ?? ""}
${button(i.brand, i.button.href, i.button.label)}
${i.after ? `<p style="margin:0;font-size:14px;color:#52525b;">${esc(i.after)}</p>` : ""}`,
    esc(i.footer ?? a.footer),
  );
  return {
    subject: subjectLine(i.subject),
    html,
    text: [i.heading, "", `${hello},`, "", i.text, ...(i.extraText ? ["", i.extraText] : []), "", `${i.button.label}: ${i.button.href}`, ...(i.after ? ["", i.after] : []), "", i.footer ?? a.footer].join("\n"),
  };
}

/** To the team: someone joined the waitlist (internal, German like the support team mail). */
export function waitlistTeamMail(i: { brand: MailBrand; email: string; name: string | null; company: string | null; useCase: string | null; locale: string; url: string }): Mail {
  const head = `Neu auf der Warteliste: ${i.company || i.name || i.email}`;
  const rows: Array<[string, string]> = [
    ["E-Mail", i.email],
    ["Name", i.name || "–"],
    ["Firma", i.company || "–"],
    ["Branche", i.useCase || "–"],
    ["Sprache", i.locale.toUpperCase()],
  ];
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${esc(head)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px;">${rows
      .map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">${esc(k)}</td><td style="padding:2px 0;">${esc(v)}</td></tr>`)
      .join("")}</table>
<p style="margin:0 0 16px;font-size:14px;color:#52525b;">Die Bestätigungsmail (Double-Opt-in) ist an die Adresse unterwegs.</p>
${button(i.brand, i.url, "Im Staff-Bereich öffnen")}`,
    "Sellycat Warteliste",
  );
  return { subject: subjectLine(head), html, text: [head, "", ...rows.map(([k, v]) => `${k}: ${v}`), "", i.url].join("\n") };
}

export type AuthMailKind = "confirm" | "reconfirm" | "recovery" | "invite";

/** Sellycat account mails: confirm the address, reset the password, accept an owner invitation. */
export function authMail(i: { kind: AuthMailKind; brand: MailBrand; url: string }): Mail {
  const a = getDictionary(i.brand.locale).access.accountMail;
  const m = a[i.kind];
  return accessMail({ brand: i.brand, subject: m.subject, heading: m.heading, name: null, text: m.text, button: { href: i.url, label: m.button }, after: a.valid, footer: a.footer });
}

/** Double opt-in after joining the waitlist. */
export function waitlistConfirmMail(i: { brand: MailBrand; name: string | null; url: string }): Mail {
  const a = getDictionary(i.brand.locale).access.mail;
  return accessMail({ brand: i.brand, subject: a.confirmSubject, heading: a.confirmHeading, name: i.name, text: a.confirmText, button: { href: i.url, label: a.confirmButton }, after: a.confirmIgnore });
}

function codeBlock(brand: MailBrand, code: string) {
  const a = getDictionary(brand.locale).access.mail;
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;border:1px solid #e4e4e7;border-radius:12px;"><tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#71717a;">${esc(a.inviteCode)}</p>
<p style="margin:0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:.08em;">${esc(code)}</p>
</td></tr></table>`,
    text: `${a.inviteCode}: ${code}`,
  };
}

/** Personal invitation from the waitlist (code + prefilled link). */
export function waitlistInviteMail(i: { brand: MailBrand; name: string | null; code: string; url: string; expiresAt: string | null; reminder?: boolean }): Mail {
  const a = getDictionary(i.brand.locale).access.mail;
  const block = codeBlock(i.brand, i.code);
  return accessMail({
    brand: i.brand,
    subject: i.reminder ? a.reminderSubject : a.inviteSubject,
    heading: i.reminder ? a.reminderHeading : a.inviteHeading,
    name: i.name,
    text: i.reminder ? a.reminderText : a.inviteText,
    extraHtml: block.html,
    extraText: block.text,
    button: { href: i.url, label: a.inviteButton },
    after: i.expiresAt ? fmt(a.inviteValid, { date: dateText(i.expiresAt, i.brand.locale) }) : a.inviteNoExpiry,
  });
}

/** Code that unlocks "Show voucher" after a scan (sent to the buyer, or the recipient of a gift). */
export function voucherAccessMail(i: { brand: MailBrand; code: string; minutes: number }): Mail {
  const r = getDictionary(i.brand.locale).voucherAccess;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(r.mailHeading)}</h1>
<p style="margin:0;">${esc(fmt(r.mailIntro, { shop: i.brand.shopName }))}</p>
<p style="margin:20px 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:.3em;">${esc(i.code)}</p>
<p style="margin:0;font-size:14px;color:#52525b;">${esc(fmt(r.mailValid, { minutes: String(i.minutes) }))} ${esc(r.mailIgnore)}</p>`,
    esc(viaSellycat(i.brand)),
  );
  return {
    subject: subjectLine(fmt(r.mailSubject, { code: i.code, shop: i.brand.shopName })),
    html,
    text: [r.mailHeading, "", fmt(r.mailIntro, { shop: i.brand.shopName }), "", i.code, "", fmt(r.mailValid, { minutes: String(i.minutes) }), r.mailIgnore].join("\n"),
  };
}

/** Steps of the welcome mail, in order, with the dashboard page each one opens. */
export const WELCOME_STEPS = [
  { key: "design", path: "/dashboard/design" },
  { key: "legal", path: "/dashboard/settings" },
  { key: "payments", path: "/dashboard/payments" },
  { key: "deal", path: "/dashboard/deals/new" },
  { key: "share", path: "/dashboard" },
] as const;

/** To a new customer after the shop was created: first steps, each with a direct link. */
export function welcomeMail(i: { brand: MailBrand; name: string; shopName: string; shopUrl: string; siteUrl: string }): Mail {
  const t = getDictionary(i.brand.locale);
  const w = t.onboardingMail;
  const steps = WELCOME_STEPS.map((s, n) => ({ n: n + 1, title: w.steps[s.key].title, text: fmt(w.steps[s.key].text, { shop: i.shopUrl.replace(/^https?:\/\//, "") }), url: `${i.siteUrl}${s.path}` }));
  const rows = steps
    .map(
      (s) => `<tr><td style="padding:12px 0;border-top:1px solid #e4e4e7;vertical-align:top;width:36px;"><span style="display:inline-block;width:26px;height:26px;border-radius:999px;background:${i.brand.primary};color:${readableOn(i.brand.primary)};font-weight:700;font-size:14px;line-height:26px;text-align:center;">${s.n}</span></td>
<td style="padding:12px 0;border-top:1px solid #e4e4e7;"><a href="${esc(s.url)}" style="font-weight:700;color:#111111;text-decoration:none;">${esc(s.title)} →</a><br><span style="font-size:14px;color:#52525b;">${esc(s.text)}</span></td></tr>`,
    )
    .join("");
  const hello = i.name ? fmt(w.helloName, { name: i.name }) : w.hello;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(fmt(w.welcomeHeading, { shop: i.shopName }))}</h1>
<p style="margin:0 0 4px;">${esc(hello)}</p>
<p style="margin:0 0 16px;">${esc(w.welcomeIntro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${rows}</table>
${button(i.brand, `${i.siteUrl}/dashboard`, w.toDashboard)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(w.help)} <a href="${esc(`${i.siteUrl}/help`)}" style="color:#111111;font-weight:600;">${esc(w.helpLink)}</a></p>`,
    esc(w.footer),
  );
  return {
    subject: subjectLine(fmt(w.welcomeSubject, { shop: i.shopName })),
    html,
    text: [fmt(w.welcomeHeading, { shop: i.shopName }), "", hello, w.welcomeIntro, "", ...steps.map((s) => `${s.n}. ${s.title}: ${s.text}\n   ${s.url}`), "", `${w.toDashboard}: ${i.siteUrl}/dashboard`, `${w.help} ${i.siteUrl}/help`].join("\n"),
  };
}

/** After a paid plan was booked: thanks, what the plan unlocks, where invoices are. */
export function subscriptionMail(i: { brand: MailBrand; name: string; shopName: string; planName: string; siteUrl: string }): Mail {
  const w = getDictionary(i.brand.locale).onboardingMail;
  const hello = i.name ? fmt(w.helloName, { name: i.name }) : w.hello;
  const html = layout(
    i.brand,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(fmt(w.planHeading, { plan: i.planName }))}</h1>
<p style="margin:0 0 4px;">${esc(hello)}</p>
<p style="margin:0 0 12px;">${esc(fmt(w.planIntro, { plan: i.planName, shop: i.shopName }))}</p>
<p style="margin:0 0 12px;">${esc(w.planNext)}</p>
${button(i.brand, `${i.siteUrl}/dashboard/billing`, w.toBilling)}
<p style="margin:0;font-size:14px;color:#52525b;">${esc(w.planInvoices)}</p>`,
    esc(w.footer),
  );
  return {
    subject: subjectLine(fmt(w.planSubject, { plan: i.planName })),
    html,
    text: [fmt(w.planHeading, { plan: i.planName }), "", hello, fmt(w.planIntro, { plan: i.planName, shop: i.shopName }), w.planNext, "", `${w.toBilling}: ${i.siteUrl}/dashboard/billing`, w.planInvoices].join("\n"),
  };
}

/** Colours and logo of a shop's own header, as the band on top of its deal alert mails. */
export type MailBand = { background: string; text: string; logoUrl: string | null };

function bandLayout(brand: MailBrand, band: MailBand, top: string, body: string, footer: string, preheader: string) {
  return `<!doctype html><html lang="${brand.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(brand.shopName)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="padding:22px 28px;background:${band.background};">${band.logoUrl ? logoImg(band.logoUrl, brand.shopName, MAIL_LOGO, `color:${band.text};font-size:18px;font-weight:700;`) : `<p style="margin:0;font-size:20px;font-weight:700;color:${band.text};">${esc(brand.shopName)}</p>`}</td></tr>
${top}<tr><td style="padding:28px;font-size:16px;line-height:1.5;">${body}</td></tr>
</table>
${footer ? `<p style="max-width:540px;margin:16px auto 0;font-size:12px;line-height:1.6;color:#71717a;">${footer}</p>` : ""}
</td></tr></table></body></html>`;
}

/** Double opt-in of the deal alert. */
export function dealAlertConfirmMail(i: { brand: MailBrand; band: MailBand; url: string }): Mail {
  const m = getDictionary(i.brand.locale).mail.dealAlert;
  const v = { shop: i.brand.shopName };
  return {
    subject: subjectLine(fmt(m.confirmSubject, v)),
    html: bandLayout(
      i.brand,
      i.band,
      "",
      `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(m.confirmHeading)}</h1><p style="margin:0;">${esc(fmt(m.confirmText, v))}</p>${button(i.brand, i.url, m.confirmButton)}<p style="margin:0;font-size:13px;color:#71717a;">${esc(m.confirmIgnore)}</p>`,
      esc(viaSellycat(i.brand)),
      fmt(m.confirmText, v),
    ),
    text: [m.confirmHeading, "", fmt(m.confirmText, v), "", `${m.confirmButton}: ${i.url}`, "", m.confirmIgnore].join("\n"),
  };
}

/** Signed up again although the alert is active already. */
export function dealAlertActiveMail(i: { brand: MailBrand; band: MailBand; unsubscribeUrl: string }): Mail {
  const m = getDictionary(i.brand.locale).mail.dealAlert;
  const v = { shop: i.brand.shopName };
  return {
    subject: subjectLine(fmt(m.activeSubject, v)),
    html: bandLayout(
      i.brand,
      i.band,
      "",
      `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">${esc(m.activeHeading)}</h1><p style="margin:0;">${esc(fmt(m.activeText, v))}</p>${button(i.brand, i.brand.shopUrl, m.activeButton)}<p style="margin:0;font-size:13px;color:#71717a;"><a href="${esc(i.unsubscribeUrl)}" style="color:#71717a;text-decoration:underline;">${esc(m.unsubscribe)}</a></p>`,
      esc(viaSellycat(i.brand)),
      fmt(m.activeText, v),
    ),
    text: [m.activeHeading, "", fmt(m.activeText, v), "", `${m.activeButton}: ${i.brand.shopUrl}`, "", `${m.unsubscribe}: ${i.unsubscribeUrl}`].join("\n"),
  };
}

export type AlertDeal = { title: string; subtitle: string | null; priceCents: number; compareAtCents: number | null; currency: string; image: string | null; left: number | null; url: string };

/** What a deal card of the alert says besides its title. */
function alertFacts(brand: MailBrand, d: AlertDeal) {
  const m = getDictionary(brand.locale).mail.dealAlert;
  const money = (c: number) => formatMoney(c, d.currency, brand.locale);
  const percent = savingsPercent(d.priceCents, d.compareAtCents);
  const saved = percent && d.compareAtCents ? fmt(m.saved, { amount: money(d.compareAtCents - d.priceCents) }) : null;
  return {
    percent,
    price: money(d.priceCents),
    was: percent && d.compareAtCents ? money(d.compareAtCents) : null,
    facts: [saved, d.left !== null ? fmt(m.left, { count: d.left }) : null].filter((x): x is string => Boolean(x)).join(" · "),
  };
}

/** Subject and message of an alert sent by hand ("" or null = the usual subject, no message). */
export type ManualAlert = { subject: string | null; message: string | null };

/**
 * Deal alert to everyone with an active subscription: a deal that just went live, or (`manual`) one
 * or several deals the shop picked, with its own subject and message.
 */
export function dealAlertMail(i: { brand: MailBrand; band: MailBand; deals: AlertDeal[]; unsubscribeUrl: string; manual?: ManualAlert }): Mail {
  const m = getDictionary(i.brand.locale).mail.dealAlert;
  const t = getDictionary(i.brand.locale).shop;
  const v = { shop: i.brand.shopName };
  const link = (href: string, label: string) => `<a href="${esc(href)}" style="color:#71717a;text-decoration:underline;">${esc(label)}</a>`;
  const single = i.deals.length === 1;
  const message = i.manual?.message?.trim() ?? "";
  const messageHtml = message ? `<p style="margin:0 0 18px;white-space:pre-line;">${esc(message)}</p>` : "";
  const image = (d: AlertDeal, radius = "") => `<a href="${esc(d.url)}"><img src="${esc(d.image!)}" alt="${esc(d.title)}" width="560" style="display:block;width:100%;height:auto;border:0;${radius}"></a>`;
  const card = (d: AlertDeal) => {
    const f = alertFacts(i.brand, d);
    const label = [i.manual ? "" : m.badge, f.percent ? `-${f.percent}%` : ""].filter(Boolean).join(" · ");
    const size = single ? 26 : 21;
    return `${label ? `<span style="display:inline-block;background:${i.brand.primary};color:${readableOn(i.brand.primary)};border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;">${esc(label)}</span>` : ""}
<h1 style="margin:14px 0 8px;font-size:${size}px;line-height:1.2;">${esc(d.title)}</h1>
${d.subtitle ? `<p style="margin:0;color:#52525b;">${esc(d.subtitle)}</p>` : ""}
<p style="margin:${single ? 18 : 12}px 0 4px;"><strong style="font-size:${size}px;">${esc(f.price)}</strong>${f.was ? ` <s style="margin-left:8px;color:#71717a;">${esc(f.was)}</s>` : ""}</p>
${f.facts ? `<p style="margin:0;font-size:14px;color:#52525b;">${esc(f.facts)}</p>` : ""}
${button(i.brand, d.url, m.button)}`;
  };
  const first = i.deals[0]!;
  const firstFacts = alertFacts(i.brand, first);
  const after = `<p style="margin:0;font-size:13px;color:#71717a;">${esc(m.after)}</p>`;
  const body = single
    ? `${messageHtml}${card(first)}\n${after}`
    : `${messageHtml}${i.deals.map((d, n) => `<div style="${n ? "margin-top:28px;padding-top:28px;border-top:1px solid #e4e4e7;" : ""}">${d.image ? `${image(d, "border-radius:12px;")}<div style="height:16px;line-height:16px;">&nbsp;</div>` : ""}${card(d)}</div>`).join("\n")}${after}`;
  const subject = i.manual?.subject?.trim() || (single ? fmt(i.manual ? m.manualSubject : m.subject, { title: first.title, price: firstFacts.price }) : fmt(m.manySubject, { ...v, count: i.deals.length }));
  const preheader = message || (single ? firstFacts.facts || first.subtitle || first.title : i.deals.map((d) => d.title).join(", "));
  return {
    subject: subjectLine(subject),
    html: bandLayout(
      i.brand,
      i.band,
      single && first.image ? `<tr><td>${image(first)}</td></tr>\n` : "",
      body,
      `${esc(fmt(m.footer, v))} ${link(i.unsubscribeUrl, m.unsubscribe)} · ${link(`${i.brand.shopUrl}/impressum`, t.imprint)} · ${link(`${i.brand.shopUrl}/datenschutz`, t.privacy)}`,
      preheader,
    ),
    text: [
      ...(message ? [message, ""] : []),
      ...i.deals.flatMap((d) => {
        const f = alertFacts(i.brand, d);
        return [d.title, ...(d.subtitle ? [d.subtitle] : []), "", `${f.price}${f.facts ? ` (${f.facts})` : ""}`, "", `${m.button}: ${d.url}`, ""];
      }),
      m.after,
      "",
      fmt(m.footer, v),
      `${m.unsubscribe}: ${i.unsubscribeUrl}`,
    ].join("\n"),
  };
}
