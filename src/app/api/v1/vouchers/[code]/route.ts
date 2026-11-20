import { apiError, apiJson, apiRoute, voucherJson } from "@/lib/api/v1";

/** GET /api/v1/vouchers/<code> – one voucher by its code (spaces, dashes and case do not matter). */
export const GET = apiRoute<{ code: string }>("read", async ({ db, tenantId }, _request, { code }) => {
  const { data: id } = await db.rpc("api_find_voucher", { p_tenant: tenantId, p_code: decodeURIComponent(code).slice(0, 120) });
  if (!id) return apiError(404, "not_found", "No such voucher in this shop.");
  const { data: v } = await db.from("vouchers").select("id, code, title, status, deal_id, partner_id, order_id, value_cents, remaining_cents, partial, valid_until, redeemed_at, created_at, redemptions(id, amount_cents, source, location_id, created_at, undone_at)").eq("id", id).eq("tenant_id", tenantId).single();
  if (!v) return apiError(404, "not_found", "No such voucher in this shop.");
  const { redemptions, ...rest } = v;
  return apiJson({ ...voucherJson(rest), redemptions });
});
