import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { brandOf } from "@/lib/mail/deliver";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { redeemCodeMail } from "@/lib/mail/templates";
import type { ShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-in with a six-digit code for the redemption app on the shop domain. The session is
 * created on the host the person is on, so it also works on a shop's own domain.
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
  const mail = redeemCodeMail({ brand: brandOf(shop), code, minutes: CODE_MINUTES });
  await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: email, ...mail, tag: "redeem-code" });
}

export type CodeResult = { ok: true } | { ok: false; error: "code" | "tooMany" | "failed" };

/** Checks the newest open code; on success the session cookies are set for this host. */
export async function verifyRedeemCode(shopId: string, rawEmail: string, rawCode: string): Promise<CodeResult> {
  const email = normEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (!validEmail(email) || code.length !== 6) return { ok: false, error: "code" };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("redeem_logins")
    .select("id, code_hash, attempts, expires_at, used_at")
    .eq("tenant_id", shopId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) return { ok: false, error: "code" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "tooMany" };
  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(hash(shopId, email, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await admin.from("redeem_logins").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: row.attempts + 1 >= MAX_ATTEMPTS ? "tooMany" : "code" };
  }
  // Claim the code once (a second request with the same code finds it used).
  const { data: claimed } = await admin.from("redeem_logins").update({ used_at: new Date().toISOString() }).eq("id", row.id).is("used_at", null).select("id");
  if (!claimed?.length) return { ok: false, error: "code" };
  // Still allowed? Then a one-time link token, exchanged right here for a session on this host.
  const { data: userId } = await admin.rpc("redeem_user_id", { p_tenant: shopId, p_email: email });
  if (!userId) return { ok: false, error: "code" };
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return { ok: false, error: "failed" };
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return verifyError ? { ok: false, error: "failed" } : { ok: true };
}
