import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import { bearer, hashKey, type ApiScope } from "@/lib/developers/rules";

/**
 * Public customer API (`/api/v1`). A key belongs to exactly one shop; every query below filters
 * by that shop explicitly (service role, after the key was checked). Errors:
 * `{ "error": { "code": "...", "message": "..." } }`.
 */

export type ApiContext = { tenantId: string; keyId: string; scopes: string[]; db: ReturnType<typeof createAdminClient> };

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
const failures = createRateLimiter({ limit: 30, windowMs: 60_000 });

const HEADERS = { "cache-control": "no-store" };

export function apiError(status: number, code: string, message: string, extra: Record<string, string> = {}) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { ...HEADERS, ...extra } });
}

export const apiJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: HEADERS });

/** Key → shop, scope and rate limit; returns a response to send instead when something is wrong. */
export async function apiAuth(request: Request, scope: ApiScope): Promise<ApiContext | NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = bearer(request.headers.get("authorization"));
  if (!key) {
    failures.check(ip);
    return apiError(401, "unauthorized", "Missing or malformed API key (Authorization: Bearer sc_live_…).");
  }
  const hash = hashKey(key);
  const rate = limiter.check(hash);
  if (!rate.ok) return apiError(429, "rate_limited", "Too many requests, at most 120 per minute.", { "retry-after": String(rate.retryAfterS) });
  const db = createAdminClient();
  const { data } = await db.rpc("api_key_auth", { p_hash: hash });
  const row = data?.[0];
  if (!row) {
    const f = failures.check(ip);
    if (!f.ok) return apiError(429, "rate_limited", "Too many failed attempts.", { "retry-after": String(f.retryAfterS) });
    return apiError(401, "unauthorized", "Invalid or revoked API key, or the shop's plan does not include the API.");
  }
  if (!row.scopes.includes(scope)) return apiError(403, "forbidden", `This key lacks the "${scope}" permission.`);
  return { tenantId: row.tenant_id, keyId: row.key_id, scopes: row.scopes, db };
}

/** Wraps a handler: auth first, unexpected errors as 500 without details. */
export function apiRoute<P>(scope: ApiScope, handler: (ctx: ApiContext, request: Request, params: P) => Promise<NextResponse>) {
  return async (request: Request, { params }: { params: Promise<P> }) => {
    const ctx = await apiAuth(request, scope);
    if (ctx instanceof NextResponse) return ctx;
    try {
      return await handler(ctx, request, await params);
    } catch (e) {
      console.error("[api]", e instanceof Error ? e.message : e);
      return apiError(500, "internal", "Something went wrong.");
    }
  };
}

// ---------------------------------------------------------------- serialisers

type VoucherRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  deal_id: string | null;
  partner_id: string | null;
  order_id: string;
  value_cents: number | null;
  remaining_cents: number | null;
  partial: boolean;
  valid_until: string | null;
  redeemed_at: string | null;
  created_at: string;
};
export const VOUCHER_COLS = "id, code, title, status, deal_id, partner_id, order_id, value_cents, remaining_cents, partial, valid_until, redeemed_at, created_at";

export function voucherJson(v: VoucherRow, now = new Date()) {
  const expired = v.status === "valid" && v.valid_until !== null && new Date(v.valid_until) <= now;
  return { ...v, status: expired ? "expired" : v.status };
}

export const ORDER_COLS = `id, number, status, email, name, locale, currency, amount_cents, refunded_cents, newsletter, gift, created_at, paid_at, order_items(deal_id, title, qty, unit_cents, total_cents), vouchers(${VOUCHER_COLS})`;

type OrderRow = Record<string, unknown> & { order_items: unknown[]; vouchers: VoucherRow[] };
export function orderJson(o: OrderRow) {
  const { order_items, vouchers, ...rest } = o;
  return { ...rest, items: order_items, vouchers: vouchers.map((v) => voucherJson(v)) };
}

/** List response with the cursor for the next page (`?before=<next>`). */
export function page<T extends { created_at: string }>(rows: T[], limit: number) {
  const more = rows.length > limit;
  const data = more ? rows.slice(0, limit) : rows;
  return { data, has_more: more, next: more ? data[data.length - 1].created_at : null };
}
