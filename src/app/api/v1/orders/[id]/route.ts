import { apiError, apiJson, apiRoute, orderJson, ORDER_COLS } from "@/lib/api/v1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/orders/<id or number> – one order with items and vouchers. */
export const GET = apiRoute<{ id: string }>("read", async ({ db, tenantId }, _request, { id }) => {
  const ref = decodeURIComponent(id).slice(0, 60);
  const { data } = await db.from("orders").select(ORDER_COLS).eq("tenant_id", tenantId).eq(UUID.test(ref) ? "id" : "number", ref).maybeSingle();
  return data ? apiJson(orderJson(data)) : apiError(404, "not_found", "No such order in this shop.");
});
