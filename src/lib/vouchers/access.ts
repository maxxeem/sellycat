import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { brandOf } from "@/lib/mail/deliver";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { voucherAccessMail } from "@/lib/mail/templates";
import type { ShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_COOKIE, ACCESS_DAYS, CODE_MINUTES, MAX_ATTEMPTS, MAX_CODES_PER_HOUR, maskEmail, tokenPattern } from "./access-rules";

/**
 * "Show voucher" after a scan: whoever holds the QR code must prove to be the owner with a code
 * sent to the order's address (gift: the recipient's). A verified device may see the voucher for
 * 30 days (random secret in a cookie scoped to /v/<token>, only its hash in the database).
 */

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const codeHash = (voucherId: string, code: string) => sha(`voucher-access:${voucherId}:${code}`);

type Owner = { voucherId: string; tenantId: string; email: string };

async function owner(token: string, tenantId: string): Promise<Owner | null> {
  if (!tokenPattern.test(token)) return null;
  const { data } = await createAdminClient().rpc("voucher_owner", { p_token: token });
  const row = data?.[0];
  return row && row.tenant_id === tenantId && row.email ? { voucherId: row.voucher_id, tenantId: row.tenant_id, email: row.email } : null;
}

/** The masked address the code would go to (null = no such voucher in this shop). */
export async function accessTarget(tenantId: string, token: string): Promise<string | null> {
  const o = await owner(token, tenantId);
  return o ? maskEmail(o.email) : null;
}

/** Sends a code to the owner. "limit" after five codes in an hour for this voucher. */
export async function sendAccessCode(shop: ShopProfile, token: string): Promise<{ ok: true; to: string } | { ok: false; error: "not_found" | "limit" | "failed" }> {
  const o = await owner(token, shop.id);
  if (!o) return { ok: false, error: "not_found" };
  const admin = createAdminClient();
  const { count } = await admin
    .from("voucher_access")
    .select("id", { count: "exact", head: true })
    .eq("voucher_id", o.voucherId)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) return { ok: false, error: "limit" };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await admin.from("voucher_access").insert({
    tenant_id: o.tenantId,
    voucher_id: o.voucherId,
    code_hash: codeHash(o.voucherId, code),
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "failed" };
  try {
    const sender = await loadSender(shop.id);
    const mail = voucherAccessMail({ brand: brandOf(shop), code, minutes: CODE_MINUTES });
    await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: o.email, ...mail, tag: "voucher-access" });
  } catch (e) {
    console.error("[voucher-access] mail", e instanceof Error ? e.message : e);
    return { ok: false, error: "failed" };
  }
  return { ok: true, to: maskEmail(o.email) };
}

/** Checks a code; on success this device may see the voucher (cookie for 30 days). */
export async function verifyAccessCode(tenantId: string, token: string, rawCode: string): Promise<{ ok: true } | { ok: false; error: "code" | "tooMany" | "not_found" }> {
  const code = rawCode.replace(/\D/g, "");
  const o = await owner(token, tenantId);
  if (!o) return { ok: false, error: "not_found" };
  if (code.length !== 6) return { ok: false, error: "code" };
  const admin = createAdminClient();
  const { data: rows } = await admin.rpc("voucher_access_try", { p_voucher: o.voucherId, p_max: MAX_ATTEMPTS });
  const row = rows?.[0];
  if (!row) return { ok: false, error: "tooMany" };
  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(codeHash(o.voucherId, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, error: row.attempts >= MAX_ATTEMPTS ? "tooMany" : "code" };
  const secret = randomBytes(32).toString("base64url");
  const until = new Date(Date.now() + ACCESS_DAYS * 86_400_000);
  const { data: claimed } = await admin
    .from("voucher_access")
    .update({ verified_at: new Date().toISOString(), device_hash: sha(secret), device_expires_at: until.toISOString() })
    .eq("id", row.id)
    .is("verified_at", null)
    .select("id");
  if (!claimed?.length) return { ok: false, error: "code" };
  (await cookies()).set(ACCESS_COOKIE, secret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/v/${token}`, expires: until });
  return { ok: true };
}

/** Has this device verified ownership of the voucher? */
export async function hasAccess(tenantId: string, token: string): Promise<boolean> {
  const secret = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!secret || secret.length < 20) return false;
  const o = await owner(token, tenantId);
  if (!o) return false;
  const { data } = await createAdminClient()
    .from("voucher_access")
    .select("id")
    .eq("voucher_id", o.voucherId)
    .eq("device_hash", sha(secret))
    .gt("device_expires_at", new Date().toISOString())
    .maybeSingle();
  return Boolean(data);
}
