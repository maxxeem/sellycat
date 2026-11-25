import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { clientIp, networkOf, rateLimit } from "@/lib/access/server";
import { brandOf, shopBase } from "@/lib/mail/deliver";
import { mailLogoUrl } from "@/lib/mail/logo";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { dealAlertActiveMail, dealAlertConfirmMail, dealAlertMail, type AlertDeal, type Mail, type MailBand, type MailBrand } from "@/lib/mail/templates";
import { readableOn } from "@/lib/design/color";
import { dealStatus, remaining } from "@/lib/shop/deal-status";
import { getShopProfile, type ShopProfile } from "@/lib/shop/queries";
import { headerBase, headerLogo } from "@/lib/shop/theme";
import { apexUrl } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextConfirmMail } from "./confirm-limit";

/**
 * Deal alert: subscribers of a shop get one mail per deal that goes live, plus what the shop sends by hand
 * (`deal_alert_manual`). What is due and who gets
 * it is decided in SQL (`deal_alert_start`, `deal_alert_claim`); this module renders and sends.
 * Runs after publishing, every five minutes (the database calls /api/cron/deal-alert when there is
 * work) and daily as a safety net.
 */
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const CONFIRM_DAYS = 7;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const newToken = () => randomBytes(32).toString("base64url");

/** Header colours and logo for the mail. The logo comes as PNG from our route. */
export function bandOf(shop: ShopProfile): MailBand {
  const background = headerBase(shop.theme);
  const logo = headerLogo(shop.theme);
  return { background, text: readableOn(background), logoUrl: mailLogoUrl(shopBase(shop), shop.id, logo, "band") };
}

export const alertOffered = (shop: ShopProfile) => shop.settings.deal_alert === true && shop.state === "online";

/** Sign-up from the shop header. Same answer for new, pending and active addresses. */
export async function subscribe(shop: ShopProfile, email: string): Promise<"ok" | "limit" | "failed"> {
  if (!(await rateLimit("deal-alert", `${shop.id}|${networkOf(await clientIp())}`, 20, 3600))) return "limit";
  const admin = createAdminClient();
  await admin.from("deal_alert_subscribers").upsert({ tenant_id: shop.id, email, token: newToken() }, { onConflict: "tenant_id,email", ignoreDuplicates: true });
  const { data: row } = await admin.from("deal_alert_subscribers").select("id, status, token, confirm_sent_at, confirm_count").eq("tenant_id", shop.id).eq("email", email).single();
  if (!row) return "failed";
  // "ok" means a mail is on its way, so every address gets one (an active one is told so): at most
  // one per minute and five per day, so nobody can be flooded through the form.
  const step = nextConfirmMail(row.confirm_sent_at, row.confirm_count, Date.now());
  if (step.kind !== "send") return step.kind === "recent" ? "ok" : "limit";
  const token = newToken();
  const pending = row.status !== "confirmed";
  const { data: claimed } = await admin
    .from("deal_alert_subscribers")
    .update({ ...(pending ? { confirm_hash: sha(token) } : {}), confirm_sent_at: new Date().toISOString(), confirm_count: step.count })
    .eq("id", row.id)
    .eq("confirm_count", row.confirm_count)
    .select("id");
  if (!claimed?.length) return "ok";
  const sender = await loadSender(shop.id);
  const look = { brand: brandOf(shop, sender), band: bandOf(shop) };
  const mail = pending ? dealAlertConfirmMail({ ...look, url: `${shopBase(shop)}/alert/confirm/${token}` }) : dealAlertActiveMail({ ...look, unsubscribeUrl: `${shopBase(shop)}/alert/off/${row.token}` });
  const r = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: email, ...mail, tag: "deal-alert-confirm" });
  if (r.ok) return "ok";
  console.error(`[deal-alert] confirm mail via ${sender.domain}:`, r.error);
  // Nothing was sent: a retry must not run into the one-minute pause and look successful.
  await admin.from("deal_alert_subscribers").update({ confirm_sent_at: row.confirm_sent_at, confirm_count: row.confirm_count }).eq("id", row.id);
  return "failed";
}

/** Link from the confirmation mail; a second click on the same link still says yes. */
export async function confirm(tenantId: string, token: string): Promise<boolean> {
  if (!tokenPattern.test(token)) return false;
  const admin = createAdminClient();
  const since = new Date(Date.now() - CONFIRM_DAYS * 86_400_000).toISOString();
  const { data } = await admin
    .from("deal_alert_subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("confirm_hash", sha(token))
    .eq("status", "pending")
    .gte("confirm_sent_at", since)
    .select("id");
  if (data?.length) return true;
  const { count } = await admin.from("deal_alert_subscribers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("confirm_hash", sha(token)).eq("status", "confirmed");
  return Boolean(count);
}

/** Unsubscribing deletes the address. */
export async function unsubscribe(token: string): Promise<void> {
  if (!tokenPattern.test(token)) return;
  await createAdminClient().from("deal_alert_subscribers").delete().eq("token", token);
}

type Work = { alert_id: string; subscriber_id: string; tenant_id: string; email: string; token: string; kind: string; deal_ids: string[]; subject: string | null; message: string | null };
type Context = { brand: MailBrand; band: MailBand; sender: Awaited<ReturnType<typeof loadSender>>; deals: AlertDeal[] };

/** Shop, sender and the given deals in their order; deals that cannot be bought any more drop out. */
async function loadContext(tenantId: string, dealIds: string[]): Promise<Context | null> {
  const admin = createAdminClient();
  const [shop, { data: rows }] = await Promise.all([
    getShopProfile(tenantId),
    admin
      .from("deals")
      .select("id, title, subtitle, slug, state, sales_start, sales_end, price_cents, compare_at_cents, total_qty, sold_qty, reserved_qty, code_source, pool_free, show_remaining, deal_images(url, sort_order)")
      .in("id", dealIds)
      .eq("tenant_id", tenantId),
  ]);
  if (!shop) return null;
  const base = shopBase(shop);
  const sender = await loadSender(shop.id);
  const deals = dealIds.flatMap((id) => {
    const d = rows?.find((r) => r.id === id);
    if (!d || !["live", "sold_out"].includes(dealStatus(d))) return [];
    const image = [...d.deal_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    return [
      {
        title: d.title,
        subtitle: d.subtitle,
        priceCents: d.price_cents,
        compareAtCents: d.compare_at_cents,
        currency: shop.currency,
        image: image ? `${base}/_next/image?url=${encodeURIComponent(image)}&w=1200&q=75` : null,
        left: d.show_remaining ? remaining(d) : null,
        url: `${base}/d/${d.slug}`,
      },
    ];
  });
  return deals.length ? { brand: brandOf(shop, sender), band: bandOf(shop), sender, deals } : null;
}

const manualOf = (subject: string | null, message: string | null) => ({ subject: subject?.trim().slice(0, 120) || null, message: message?.trim().slice(0, 600) || null });

/** The mail of a manual alert as it would look (preview and test mail; the unsubscribe link leads nowhere). */
export async function manualAlertMail(tenantId: string, dealIds: string[], subject: string, message: string): Promise<{ mail: Mail; sender: Context["sender"] } | null> {
  const c = await loadContext(tenantId, dealIds.slice(0, 10));
  return c ? { mail: dealAlertMail({ brand: c.brand, band: c.band, deals: c.deals, unsubscribeUrl: c.brand.shopUrl, manual: manualOf(subject, message) }), sender: c.sender } : null;
}

/** Queues newly live deals and sends what is due, within the time budget. */
export async function runDealAlerts({ budgetMs = 240_000 } = {}): Promise<{ started: number; sent: number; failed: number }> {
  const admin = createAdminClient();
  const until = Date.now() + budgetMs;
  const { data: started, error } = await admin.rpc("deal_alert_start");
  if (error) console.error("[deal-alert] start", error.message);
  const out = { started: started ?? 0, sent: 0, failed: 0 };
  const contexts = new Map<string, Promise<Context | null>>();
  while (Date.now() < until) {
    const { data } = await admin.rpc("deal_alert_claim", { p_limit: 20 });
    const batch = (data ?? []) as Work[];
    if (!batch.length) break;
    await Promise.all(
      batch.map(async (w) => {
        let message: string | null = null;
        try {
          if (!contexts.has(w.alert_id)) contexts.set(w.alert_id, loadContext(w.tenant_id, w.deal_ids));
          const c = await contexts.get(w.alert_id);
          if (!c) throw new Error("deal or shop missing");
          const mail = dealAlertMail({ brand: c.brand, band: c.band, deals: c.deals, unsubscribeUrl: `${c.brand.shopUrl}/alert/off/${w.token}`, manual: w.kind === "manual" ? manualOf(w.subject, w.message) : undefined });
          const r = await sendMail({
            domain: c.sender.domain,
            from: c.sender.from,
            replyTo: c.sender.replyTo,
            to: w.email,
            ...mail,
            tag: "deal-alert",
            headers: { "List-Unsubscribe": `<${c.brand.shopUrl}/api/deal-alert/unsubscribe?t=${w.token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          });
          if (!r.ok) message = r.error;
        } catch (e) {
          message = e instanceof Error ? e.message : String(e);
        }
        if (message) {
          out.failed += 1;
          console.error(`[deal-alert] ${w.alert_id}:`, message);
        } else out.sent += 1;
        await admin.rpc("deal_alert_done", { p_alert: w.alert_id, p_subscriber: w.subscriber_id, p_ok: !message, p_error: message ?? undefined });
      }),
    );
  }
  return out;
}

/** After a change that may put a deal live (publishing, shop online). */
export function kickDealAlerts() {
  after(() => runDealAlerts({ budgetMs: 40_000 }).catch((e) => console.error("[deal-alert]", e instanceof Error ? e.message : e)));
}

/** Tells the database where to call this app (only real deployments). */
export async function registerWakeUrl() {
  const url = apexUrl();
  if (url.startsWith("https://")) await createAdminClient().from("deal_alert_tick").update({ url: `${url}/api/cron/deal-alert` }).eq("id", true);
}

/** Addresses never confirmed disappear after a week. */
export async function pruneSubscribers() {
  await createAdminClient().from("deal_alert_subscribers").delete().eq("status", "pending").lt("created_at", new Date(Date.now() - CONFIRM_DAYS * 86_400_000).toISOString());
}
