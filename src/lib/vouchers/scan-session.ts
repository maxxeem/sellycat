import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ownsAccountSession } from "@/lib/supabase/cookie-domain";
import { findVoucher, redeem, redeemResult, sharedCodeError, amountCents, voucherInfo, type VoucherError, type VoucherInfo } from "./redeem";

/**
 * Who is redeeming on this shop's host.
 *
 * Signing in with an email code gives a session of its own (cookie `sc_scan`): good for this shop and
 * host only, and for nothing but finding and redeeming vouchers. A full account session is never
 * created on a shop's host: the domain may belong to the customer, and the account to someone who
 * works for other shops too.
 *
 * A partner on a code (instead of scanners) gets the same kind of session without a person: it
 * finds and redeems that partner's vouchers only, and ends when the code changes.
 *
 * Only on Sellycat's own hosts, where the dashboard session exists anyway, that one counts as well.
 */
const DAYS = 30;
const secureCookie = process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL);
/** `__Host-`: no other subdomain (a sibling shop) can plant or read it. */
export const SCAN_COOKIE = secureCookie ? "__Host-sc_scan" : "sc_scan";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function requestHost(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase().split(":")[0]!;
}

export type Lookup = { ok: true; voucher: VoucherInfo } | { ok: false; error: VoucherError } | { ok: false; error: "other_partner"; partner: string };
export type ScanActor = {
  /** Stable key for limits (person or partner). */
  key: string;
  /** The person, null for a partner code. */
  userId: string | null;
  partnerId: string | null;
  /** Shown as "signed in as …": email, or the partner's name for a code. */
  label: string;
  /** "scan" = this app's own session, "code" = a partner code, "account" = the dashboard session on a Sellycat host. */
  kind: "scan" | "code" | "account";
  find: (by: { code?: string; token?: string }) => Promise<Lookup>;
  redeem: (voucherId: string, amount: string | null) => Promise<{ ok: true; remaining: number | null } | { ok: false; error: VoucherError }>;
};

export async function startScanSession(shopId: string, who: { userId: string } | { partnerId: string }): Promise<boolean> {
  const admin = createAdminClient();
  const secret = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 86_400_000);
  const owner = "userId" in who ? { user_id: who.userId } : { partner_id: who.partnerId };
  const { error } = await admin.from("scan_sessions").insert({ token_hash: sha(secret), tenant_id: shopId, ...owner, host: await requestHost(), expires_at: expires.toISOString() });
  if (error) return false;
  // Old ones are of no use any more.
  await admin.from("scan_sessions").delete().lt("expires_at", new Date().toISOString());
  (await cookies()).set(SCAN_COOKIE, secret, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/", expires });
  return true;
}

/** Ends the app's session (also in the database). True when there was one. */
export async function endScanSession(): Promise<boolean> {
  const store = await cookies();
  const secret = store.get(SCAN_COOKIE)?.value;
  if (!secret) return false;
  await createAdminClient().from("scan_sessions").delete().eq("token_hash", sha(secret));
  store.set(SCAN_COOKIE, "", { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/", maxAge: 0 });
  return true;
}

type SessionOwner = { kind: "user"; id: string; email: string } | { kind: "partner"; id: string; name: string };

async function scanUser(shopId: string): Promise<SessionOwner | null> {
  const secret = (await cookies()).get(SCAN_COOKIE)?.value;
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return null;
  const { data } = await createAdminClient().rpc("scan_session_use", { p_hash: sha(secret), p_tenant: shopId, p_host: await requestHost() });
  const row = data?.[0];
  if (!row) return null;
  if (row.partner_id) return { kind: "partner", id: row.partner_id, name: row.partner_name ?? "" };
  return row.user_id ? { kind: "user", id: row.user_id, email: row.email ?? "" } : null;
}

/** Turns scan_find / scan_find_partner output into a lookup result. */
async function lookupResult(admin: ReturnType<typeof createAdminClient>, shopId: string, data: unknown, error: unknown): Promise<Lookup> {
  const r = (data ?? {}) as { id?: string; shared?: string; partner?: string; error?: string };
  if (error) return { ok: false, error: "failed" };
  if (r.error) return { ok: false, error: "forbidden" };
  if (r.shared) return { ok: false, error: r.shared === "qr" ? "shared_qr" : "shared_partner" };
  if (typeof r.partner === "string") return { ok: false, error: "other_partner", partner: r.partner };
  const voucher = r.id ? await voucherInfo(admin, r.id, shopId) : null;
  return voucher ? { ok: true, voucher } : { ok: false, error: "not_found" };
}

/** The person who may redeem in this shop on this host, or null. */
export const scanActor = cache(async (shopId: string): Promise<ScanActor | null> => {
  const own = await scanUser(shopId);
  if (own?.kind === "partner") {
    const admin = createAdminClient();
    return {
      key: `partner:${own.id}`,
      userId: null,
      partnerId: own.id,
      label: own.name,
      kind: "code",
      find: async ({ code, token }) => {
        const { data, error } = await admin.rpc("scan_find_partner", { p_tenant: shopId, p_partner: own.id, p_code: (code ?? null) as string, p_token: (token ?? null) as string });
        return lookupResult(admin, shopId, data, error);
      },
      redeem: async (id, amount) => {
        const cents = amountCents(amount);
        if (cents === "invalid") return { ok: false, error: "amount" };
        const { data, error } = await admin.rpc("scan_redeem_partner", { p_tenant: shopId, p_partner: own.id, p_voucher: id, p_amount: cents });
        return redeemResult(id, error ? null : data);
      },
    };
  }
  if (own) {
    const admin = createAdminClient();
    return {
      key: own.id,
      userId: own.id,
      partnerId: null,
      label: own.email,
      kind: "scan",
      find: async ({ code, token }) => {
        const { data, error } = await admin.rpc("scan_find", { p_tenant: shopId, p_user: own.id, p_code: (code ?? null) as string, p_token: (token ?? null) as string });
        return lookupResult(admin, shopId, data, error);
      },
      redeem: async (id, amount) => {
        const cents = amountCents(amount);
        if (cents === "invalid") return { ok: false, error: "amount" };
        const { data, error } = await admin.rpc("scan_redeem", { p_tenant: shopId, p_user: own.id, p_voucher: id, p_amount: cents });
        return redeemResult(id, error ? null : data);
      },
    };
  }
  // A customer's own domain never carries an account session.
  if (!ownsAccountSession(await requestHost())) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  if ((await supabase.rpc("can_use_redeem", { p_tenant: shopId })).data !== true) return null;
  return {
    key: user.id,
    userId: user.id,
    partnerId: null,
    label: user.email,
    kind: "account",
    find: async ({ code, token }) => {
      const voucher = (token ? await findVoucher(supabase, shopId, { token }) : null) ?? (code ? await findVoucher(supabase, shopId, { code }) : null);
      if (voucher) return { ok: true, voucher };
      const shared = code ? await sharedCodeError(supabase, shopId, code) : null;
      if (shared) return { ok: false, error: shared };
      // A voucher of this shop that belongs to another partner: say so instead of "not found".
      const { data: partner } = await supabase.rpc("voucher_partner_hint", { p_tenant: shopId, p_code: code ?? "", p_token: token ?? "" });
      return typeof partner === "string" ? { ok: false, error: "other_partner", partner } : { ok: false, error: "not_found" };
    },
    redeem: async (id, amount) => {
      const { data: v } = await supabase.from("vouchers").select("id").eq("id", id).eq("tenant_id", shopId).maybeSingle();
      return v ? redeem(supabase, id, amount, "pwa") : { ok: false, error: "not_found" };
    },
  };
});
