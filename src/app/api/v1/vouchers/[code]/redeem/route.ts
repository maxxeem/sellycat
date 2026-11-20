import { after } from "next/server";
import { apiError, apiJson, apiRoute, voucherJson, VOUCHER_COLS } from "@/lib/api/v1";
import { kickWebhooks } from "@/lib/developers/webhooks";
import { walletUpdate } from "@/lib/wallet/passes";

const ERRORS: Record<string, [number, string]> = {
  not_found: [404, "No such voucher in this shop."],
  location: [400, "location_id does not belong to this voucher's partner."],
  redeemed: [409, "The voucher has already been redeemed."],
  expired: [409, "The voucher has expired."],
  refunded: [409, "The voucher was refunded."],
  void: [409, "The voucher is void."],
  outside_window: [409, "The deal cannot be redeemed at this time."],
  amount: [400, "amount_cents is invalid or higher than the remaining value."],
};

/**
 * POST /api/v1/vouchers/<code>/redeem – redeems in full, or `amount_cents` of a partly usable
 * value voucher. Body (optional): { "amount_cents": 1500, "location_id": "…", "note": "…" }.
 */
export const POST = apiRoute<{ code: string }>("redeem", async ({ db, tenantId, keyId }, request, { code }) => {
  let body: Record<string, unknown> = {};
  const text = await request.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      return apiError(400, "invalid_json", "The body must be JSON.");
    }
  }
  const amount = body.amount_cents;
  if (amount !== undefined && amount !== null && !(Number.isInteger(amount) && (amount as number) > 0)) return apiError(400, "amount", "amount_cents must be a positive integer.");
  const location = typeof body.location_id === "string" && /^[0-9a-f-]{36}$/i.test(body.location_id) ? body.location_id : null;
  if (body.location_id && !location) return apiError(400, "location", "location_id must be a UUID.");
  const { data, error } = await db.rpc("api_redeem_voucher", {
    p_tenant: tenantId,
    p_key: keyId,
    p_code: decodeURIComponent(code).slice(0, 120),
    p_amount: (amount as number | undefined) ?? undefined,
    p_location: location ?? undefined,
    p_note: typeof body.note === "string" ? body.note : undefined,
  });
  if (error || !data) throw new Error(error?.message ?? "api_redeem_voucher");
  const r = data as { ok: boolean; error?: string; voucher?: string };
  if (!r.ok) {
    const [status, message] = ERRORS[r.error ?? ""] ?? [400, "The voucher cannot be redeemed."];
    return apiError(status, r.error ?? "failed", message);
  }
  after(() => walletUpdate([r.voucher!]));
  kickWebhooks(tenantId);
  const { data: v } = await db.from("vouchers").select(VOUCHER_COLS).eq("id", r.voucher!).single();
  return apiJson({ ok: true, voucher: v ? voucherJson(v) : null });
});
