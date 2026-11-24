import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { clientIp, networkOf, rateLimit } from "@/lib/access/server";
import { brandOf, shopBase } from "@/lib/mail/deliver";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { dealAlertConfirmMail, dealAlertMail, type MailBand, type MailBrand } from "@/lib/mail/templates";
import { readableOn } from "@/lib/design/color";
import { remaining } from "@/lib/shop/deal-status";
import { getShopProfile, type ShopProfile } from "@/lib/shop/queries";
import { headerBase, headerLogo } from "@/lib/shop/theme";
import { apexUrl } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deal alert: subscribers of a shop get one mail per deal that goes live. What is due and who gets
 * it is decided in SQL (`deal_alert_start`, `deal_alert_claim`); this module renders and sends.
 * Runs after publishing, every five minutes (the database calls /api/cron/deal-alert when there is
 * work) and daily as a safety net.
 */
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const CONFIRM_DAYS = 7;
const CONFIRM_MAX = 5;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const newToken = () => randomBytes(32).toString("base64url");

/** Header colours and logo for the mail. SVG logos are not shown by mail clients, so it comes as PNG from our route. */
export function bandOf(shop: ShopProfile): MailBand {
  const background = headerBase(shop.theme);
  const logo = headerLogo(shop.theme);
  return { background, text: readableOn(background), logoUrl: logo ? `${shopBase(shop)}/api/deal-alert/logo/${shop.id}?v=${sha(logo).slice(0, 12)}` : null };
}

export const alertOffered = (shop: ShopProfile) => shop.settings.deal_alert === true && shop.state === "online";

/** Sign-up from the shop header. Same answer for new, pending and active addresses. */
export async function subscribe(shop: ShopProfile, email: string): Promise<"ok" | "limit" | "failed"> {
  if (!(await rateLimit("deal-alert", `${shop.id}|${networkOf(await clientIp())}`, 20, 3600))) return "limit";
  const admin = createAdminClient();
  await admin.from("deal_alert_subscribers").upsert({ tenant_id: shop.id, email, token: newToken() }, { onConflict: "tenant_id,email", ignoreDuplicates: true });
  const { data: row } = await admin.from("deal_alert_subscribers").select("id, status, confirm_sent_at, confirm_count").eq("tenant_id", shop.id).eq("email", email).single();
  if (!row) return "failed";
  if (row.status === "confirmed") return "ok";
  // One confirmation mail per minute and five in all, so nobody can be flooded through the form.
  const recent = row.confirm_sent_at && Date.now() - new Date(row.confirm_sent_at).getTime() < 60_000;
  if (recent || row.confirm_count >= CONFIRM_MAX) return "ok";
  const token = newToken();
  const { data: claimed } = await admin
    .from("deal_alert_subscribers")
    .update({ confirm_hash: sha(token), confirm_sent_at: new Date().toISOString(), confirm_count: row.confirm_count + 1 })
    .eq("id", row.id)
    .eq("confirm_count", row.confirm_count)
    .select("id");
  if (!claimed?.length) return "ok";
  const sender = await loadSender(shop.id);
  const mail = dealAlertConfirmMail({ brand: brandOf(shop), band: bandOf(shop), url: `${shopBase(shop)}/alert/confirm/${token}` });
  const r = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: email, ...mail, tag: "deal-alert-confirm" });
  return r.ok ? "ok" : "failed";
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

type Work = { alert_id: string; subscriber_id: string; tenant_id: string; deal_id: string; email: string; token: string };
type Context = { brand: MailBrand; band: MailBand; sender: Awaited<ReturnType<typeof loadSender>>; deal: Parameters<typeof dealAlertMail>[0]["deal"] };

async function loadContext(w: Work): Promise<Context | null> {
  const admin = createAdminClient();
  const [shop, { data: d }] = await Promise.all([
    getShopProfile(w.tenant_id),
    admin
      .from("deals")
      .select("title, subtitle, slug, price_cents, compare_at_cents, total_qty, sold_qty, reserved_qty, code_source, pool_free, show_remaining, deal_images(url, sort_order)")
      .eq("id", w.deal_id)
      .eq("tenant_id", w.tenant_id)
      .maybeSingle(),
  ]);
  if (!shop || !d) return null;
  const base = shopBase(shop);
  const image = [...d.deal_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
  return {
    brand: brandOf(shop),
    band: bandOf(shop),
    sender: await loadSender(shop.id),
    deal: {
      title: d.title,
      subtitle: d.subtitle,
      priceCents: d.price_cents,
      compareAtCents: d.compare_at_cents,
      currency: shop.currency,
      image: image ? `${base}/_next/image?url=${encodeURIComponent(image)}&w=1200&q=75` : null,
      left: d.show_remaining ? remaining(d) : null,
      url: `${base}/d/${d.slug}`,
    },
  };
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
          if (!contexts.has(w.alert_id)) contexts.set(w.alert_id, loadContext(w));
          const c = await contexts.get(w.alert_id);
          if (!c) throw new Error("deal or shop missing");
          const mail = dealAlertMail({ brand: c.brand, band: c.band, deal: c.deal, unsubscribeUrl: `${c.brand.shopUrl}/alert/off/${w.token}` });
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
