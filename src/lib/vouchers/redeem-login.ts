import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { brandOf } from "@/lib/mail/deliver";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { redeemCodeMail } from "@/lib/mail/templates";
import type { ShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { startScanSession } from "./scan-session";

/**
 * Sign-in with a six-digit code for the redemption app on the shop domain. It gives a
 * session of the app itself (scan-session.ts), never an account session.
 */
export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;

const hash = (tenantId: string, email: string, code: string) => createHash("sha256").update(`${tenantId}:${email}:${code}`).digest("hex");
export const normEmail = (email: string) => email.trim().toLowerCase().slice(0, 254);
const validEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

/** Sends a code if the address belongs to someone who may redeem here; silent otherwise. */
export async function sendRedeemCode(shop: ShopProfile, rawEmail: string): Promise<void> {
  const email = normEmail(rawEmail);
  if (!validEmail(email)) return;
  const admin = createAdminClient();
  const { data: userId } = await admin.rpc("redeem_user_id", { p_tenant: shop.id, p_email: email });
  if (!userId) return;
  const { count } = await admin
    .from("redeem_logins")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", shop.id)
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) return;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await admin.from("redeem_logins").insert({
    tenant_id: shop.id,
    email,
    code_hash: hash(shop.id, email, code),
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (error) return;
  const sender = await loadSender(shop.id);
  const mail = redeemCodeMail({ brand: brandOf(shop, sender), code, minutes: CODE_MINUTES });
  await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: email, ...mail, tag: "redeem-code" });
}

export type CodeResult = { ok: true } | { ok: false; error: "code" | "tooMany" | "failed" };

/** Checks the newest open code; on success the app's session starts on this host. */
export async function verifyRedeemCode(shopId: string, rawEmail: string, rawCode: string): Promise<CodeResult> {
  const email = normEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (!validEmail(email) || code.length !== 6) return { ok: false, error: "code" };
  const admin = createAdminClient();
  // Counts this guess before comparing (atomic in SQL, so parallel guesses cannot exceed the limit).
  const { data: rows } = await admin.rpc("redeem_login_try", { p_tenant: shopId, p_email: email, p_max: MAX_ATTEMPTS });
  const row = rows?.[0];
  if (!row) {
    // No open code, or the limit is used up: tell which, without revealing more.
    const { data: last } = await admin.from("redeem_logins").select("attempts, used_at, expires_at").eq("tenant_id", shopId).eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const open = last && !last.used_at && new Date(last.expires_at).getTime() > Date.now();
    return { ok: false, error: open && last.attempts >= MAX_ATTEMPTS ? "tooMany" : "code" };
  }
  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(hash(shopId, email, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, error: row.attempts >= MAX_ATTEMPTS ? "tooMany" : "code" };
  }
  // Claim the code once (a second request with the same code finds it used).
  const { data: claimed } = await admin.from("redeem_logins").update({ used_at: new Date().toISOString() }).eq("id", row.id).is("used_at", null).select("id");
  if (!claimed?.length) return { ok: false, error: "code" };
  // Still allowed? Then a session of this app, for this shop and host only.
  const { data: userId } = await admin.rpc("redeem_user_id", { p_tenant: shopId, p_email: email });
  if (!userId) return { ok: false, error: "code" };
  return (await startScanSession(shopId, userId)) ? { ok: true } : { ok: false, error: "failed" };
}
