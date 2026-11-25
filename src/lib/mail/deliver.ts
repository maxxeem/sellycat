import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { shopUrlForSlug } from "@/lib/site/hosts";
import { getShopProfile, type ShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletAvailable } from "@/lib/wallet/passes";
import { lightLogo, loadVouchers, pdfInput, pdfName, type VoucherBundle } from "@/lib/vouchers/data";
import { mailLogoUrl } from "./logo";
import { renderVoucherPdf } from "@/lib/vouchers/pdf";
import { mailConfigured, sendMail, type Attachment, type MailResult } from "./mailgun";
import { loadSender } from "./sender-load";
import { expiryMail, giftMail, myLinkMail, orderMail, type MailBrand, type MailVoucher } from "./templates";

/**
 * Sending the mails of an order. Each mail is claimed in the database first (`mail_sent_at`,
 * `gift_sent_at`), so webhook, return page and cron never send it twice; on failure the claim is
 * released and the next cron run tries again. Every attempt lands in `mail_log`.
 */

const PAID = ["paid", "partially_refunded"] as const;
export const MY_LINK_HOURS = 24;

/** Today in Zurich as YYYY-MM-DD (gifts are scheduled per day). */
export const zurichDay = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });

export function shopBase(shop: Pick<ShopProfile, "primaryHost" | "slug">): string {
  if (!shop.primaryHost) return shopUrlForSlug(shop.slug);
  return `${shop.primaryHost.startsWith("localhost") || shop.primaryHost.includes(".localhost") ? "http" : "https"}://${shop.primaryHost}`;
}

/** `sender`: whom the mail comes from (loadSender), decides whether Sellycat is named in it. */
export function brandOf(shop: ShopProfile, sender: { own: boolean }): MailBrand {
  return { shopName: shop.name, locale: shop.locale, primary: shop.theme.colors.primary, logoUrl: mailLogoUrl(shopBase(shop), shop.id, lightLogo(shop), "light"), shopUrl: shopBase(shop), ownSender: sender.own };
}

const mailVouchers = (b: VoucherBundle): MailVoucher[] => {
  const w = walletAvailable();
  const base = shopBase(b.shop);
  return b.vouchers.map((v) => ({
    title: v.title,
    partner: v.partner,
    code: v.code,
    valueCents: v.valueCents,
    currency: v.currency,
    validUntil: v.validUntil,
    link: v.link,
    wallet: v.status === "valid" ? { ...(w.apple ? { apple: `${base}/v/${v.token}/pkpass` } : {}), ...(w.google ? { google: `${base}/v/${v.token}/google` } : {}) } : undefined,
  }));
};

async function log(row: { tenant_id: string; order_id: string | null; kind: "order" | "gift" | "my_link" | "reminder"; recipient: string; sender: string | null; result: MailResult }) {
  const { result, ...rest } = row;
  await createAdminClient()
    .from("mail_log")
    .insert({ ...rest, status: result.ok ? (result.skipped ? "skipped" : "sent") : "failed", provider_id: result.ok ? result.id : null, error: result.ok ? null : result.error.slice(0, 500) });
}

type OrderRow = {
  id: string;
  tenant_id: string;
  number: string;
  status: string;
  email: string;
  name: string | null;
  stripe_session_id: string | null;
  gift: boolean;
  gift_name: string | null;
  gift_email: string | null;
  gift_from: string | null;
  gift_message: string | null;
  gift_send_on: string | null;
  gift_sent_at: string | null;
  mail_sent_at: string | null;
};
const ORDER_SELECT = "id, tenant_id, number, status, email, name, stripe_session_id, gift, gift_name, gift_email, gift_from, gift_message, gift_send_on, gift_sent_at, mail_sent_at";

async function bundleWithPdf(order: OrderRow): Promise<{ bundle: VoucherBundle; attachment: Attachment } | null> {
  const shop = await getShopProfile(order.tenant_id);
  if (!shop) return null;
  // Links point to the shop's public address (custom domain or subdomain).
  const bundle = await loadVouchers(order.tenant_id, { orderId: order.id }, new URL(shopBase(shop)).host);
  if (!bundle) return null;
  const pdf = await renderVoucherPdf(pdfInput(bundle));
  return { bundle, attachment: { filename: pdfName(bundle), content: new Uint8Array(pdf), contentType: "application/pdf" } };
}

/** Buyer mail (and the gift mail when it is due). `force` sends again (dashboard "resend"). */
export async function deliverOrder(orderId: string, { force = false } = {}): Promise<{ order: boolean; gift: boolean }> {
  const done = { order: false, gift: false };
  if (!mailConfigured()) return done;
  const admin = createAdminClient();
  const { data } = await admin.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  const order = data as OrderRow | null;
  if (!order || !(PAID as readonly string[]).includes(order.status)) return done;

  // Claim (a single UPDATE, so two parallel callers cannot both win).
  const claim = admin.from("orders").update({ mail_sent_at: new Date().toISOString() }).eq("id", order.id);
  const { data: claimed } = force ? await claim.select("id") : await claim.is("mail_sent_at", null).select("id");
  if (claimed?.length) {
    try {
      const prepared = await bundleWithPdf(order);
      if (!prepared) throw new Error("no vouchers");
      const { bundle, attachment } = prepared;
      const base = shopBase(bundle.shop);
      const sender = await loadSender(order.tenant_id);
      const mail = orderMail({
        brand: brandOf(bundle.shop, sender),
        number: order.number,
        orderUrl: `${base}/order/${order.id}?session_id=${encodeURIComponent(order.stripe_session_id ?? "")}`,
        myUrl: `${base}/my`,
        vouchers: mailVouchers(bundle),
        gift: order.gift && order.gift_email ? { email: order.gift_email, sendOn: order.gift_send_on, sent: Boolean(order.gift_sent_at) } : null,
      });
      const result = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: order.email, ...mail, tag: "order", attachments: [attachment] });
      await log({ tenant_id: order.tenant_id, order_id: order.id, kind: "order", recipient: order.email, sender: sender.address, result });
      if (!result.ok) throw new Error(result.error);
      done.order = true;
    } catch (e) {
      console.error(`[mail] order ${order.id}:`, e instanceof Error ? e.message : e);
      if (!force) await admin.from("orders").update({ mail_sent_at: null }).eq("id", order.id);
    }
  }

  if (order.gift && !order.gift_sent_at && (!order.gift_send_on || order.gift_send_on <= zurichDay())) done.gift = await deliverGift(order.id);
  return done;
}

/** Gift mail to the recipient (claimed via `gift_sent_at`). */
export async function deliverGift(orderId: string, { force = false } = {}): Promise<boolean> {
  if (!mailConfigured()) return false;
  const admin = createAdminClient();
  const claim = admin.from("orders").update({ gift_sent_at: new Date().toISOString() }).eq("id", orderId).eq("gift", true).in("status", PAID);
  const { data: rows } = force ? await claim.select(ORDER_SELECT) : await claim.is("gift_sent_at", null).select(ORDER_SELECT);
  const order = (rows?.[0] ?? null) as OrderRow | null;
  if (!order?.gift_email) return false;
  try {
    const prepared = await bundleWithPdf(order);
    if (!prepared) throw new Error("no vouchers");
    const { bundle, attachment } = prepared;
    const sender = await loadSender(order.tenant_id);
    const mail = giftMail({
      brand: brandOf(bundle.shop, sender),
      from: order.gift_from || order.name,
      name: order.gift_name,
      message: order.gift_message,
      vouchers: mailVouchers(bundle),
      myUrl: `${shopBase(bundle.shop)}/my`,
    });
    const result = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: order.gift_email, ...mail, tag: "gift", attachments: [attachment] });
    await log({ tenant_id: order.tenant_id, order_id: order.id, kind: "gift", recipient: order.gift_email, sender: sender.address, result });
    if (!result.ok) throw new Error(result.error);
    return true;
  } catch (e) {
    console.error(`[mail] gift ${order.id}:`, e instanceof Error ? e.message : e);
    if (!force) await admin.from("orders").update({ gift_sent_at: null }).eq("id", order.id);
    return false;
  }
}

/** Cron: gifts due today and buyer mails that failed or never started (last 3 days). */
export async function deliverDue(limit = 100): Promise<{ orders: number; gifts: number; failed: number }> {
  const result = { orders: 0, gifts: 0, failed: 0 };
  if (!mailConfigured()) return result;
  const admin = createAdminClient();
  const settled = new Date(Date.now() - 5 * 60_000).toISOString();
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const [{ data: open }, { data: gifts }] = await Promise.all([
    admin.from("orders").select("id").in("status", PAID).is("mail_sent_at", null).gte("paid_at", since).lt("paid_at", settled).limit(limit),
    admin.from("orders").select("id").eq("gift", true).in("status", PAID).is("gift_sent_at", null).lte("gift_send_on", zurichDay()).limit(limit),
  ]);
  for (const o of open ?? []) {
    const r = await deliverOrder(o.id);
    if (r.order) result.orders++;
    else result.failed++;
    if (r.gift) result.gifts++;
  }
  for (const g of gifts ?? []) {
    if (await deliverGift(g.id)) result.gifts++;
    else result.failed++;
  }
  return result;
}

// ---------------------------------------------------------------- "my vouchers" links

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Sends a sign-in link when the address bought or received vouchers in this shop. The caller
 * always answers the same, so nobody learns which addresses are customers.
 */
export async function sendMyLink(shop: ShopProfile, email: string): Promise<void> {
  const admin = createAdminClient();
  const [{ count: bought }, { count: received }] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", shop.id).eq("email", email).in("status", PAID),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", shop.id).eq("gift_email", email).in("status", PAID).not("gift_sent_at", "is", null),
  ]);
  if (!bought && !received) return;
  // At most 5 links per address and hour.
  const { count: recent } = await admin
    .from("buyer_links")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", shop.id)
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((recent ?? 0) >= 5) return;
  const token = randomBytes(24).toString("base64url");
  await admin.from("buyer_links").insert({ tenant_id: shop.id, email, token_hash: hashToken(token), expires_at: new Date(Date.now() + MY_LINK_HOURS * 3_600_000).toISOString() });
  const sender = await loadSender(shop.id);
  const mail = myLinkMail({ brand: brandOf(shop, sender), url: `${shopBase(shop)}/my/${token}` });
  const result = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: email, ...mail, tag: "my-link" });
  await log({ tenant_id: shop.id, order_id: null, kind: "my_link", recipient: email, sender: sender.address, result });
}

/** The address behind a valid link, or null. */
export async function emailForLink(tenantId: string, token: string): Promise<string | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const { data } = await createAdminClient().from("buyer_links").select("email, expires_at").eq("tenant_id", tenantId).eq("token_hash", hashToken(token)).maybeSingle();
  return data && new Date(data.expires_at).getTime() > Date.now() ? data.email : null;
}

// ---------------------------------------------------------------- expiry reminders

export const REMINDER_DAYS = 7;

/**
 * Once per voucher, about a week before it expires: a reminder to whoever holds it (the gift
 * recipient once the gift went out, otherwise the buyer). Vouchers bought in the last day are
 * left alone.
 */
export async function sendExpiryReminders(limit = 200): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();
  const now = Date.now();
  const { data } = await admin
    .from("vouchers")
    .select("id, tenant_id, order_id, token, valid_until, orders(email, gift, gift_email, gift_sent_at)")
    .eq("status", "valid")
    .is("reminder_sent_at", null)
    .gt("valid_until", new Date(now).toISOString())
    .lte("valid_until", new Date(now + REMINDER_DAYS * 86_400_000).toISOString())
    .lt("created_at", new Date(now - 86_400_000).toISOString())
    .order("valid_until")
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const v of data ?? []) {
    const { data: claimed } = await admin.from("vouchers").update({ reminder_sent_at: new Date().toISOString() }).eq("id", v.id).is("reminder_sent_at", null).select("id");
    if (!claimed?.length || !v.valid_until) continue;
    const bundle = await loadVouchers(v.tenant_id, { token: v.token }, "");
    const o = v.orders;
    if (!bundle || !o) continue;
    const to = o.gift && o.gift_sent_at && o.gift_email ? o.gift_email : o.email;
    const sender = await loadSender(v.tenant_id);
    const mail = expiryMail({ brand: brandOf(bundle.shop, sender), vouchers: mailVouchers(bundle), validUntil: v.valid_until, url: bundle.vouchers[0].link });
    const result = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to, ...mail, tag: "reminder" });
    await log({ tenant_id: v.tenant_id, order_id: v.order_id, kind: "reminder", recipient: to, sender: sender.address, result });
    if (result.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
