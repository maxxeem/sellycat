import { apiError, apiJson, apiRoute, orderJson, ORDER_COLS, page } from "@/lib/api/v1";
import { parseLimit, parseTime } from "@/lib/developers/rules";

const STATUSES = ["pending", "paid", "partially_refunded", "refunded", "expired"];

/** GET /api/v1/orders – newest first; `?status=`, `?since=`, `?before=` (cursor), `?limit=` (≤ 100). */
export const GET = apiRoute<Record<string, never>>("read", async ({ db, tenantId }, request) => {
  const p = new URL(request.url).searchParams;
  const limit = parseLimit(p.get("limit"));
  const status = p.get("status");
  if (status && !STATUSES.includes(status)) return apiError(400, "invalid_status", `status must be one of ${STATUSES.join(", ")}.`);
  let q = db.from("orders").select(ORDER_COLS).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(limit + 1);
  if (status) q = q.eq("status", status as "paid");
  else q = q.neq("status", "pending");
  const since = parseTime(p.get("since"));
  const before = parseTime(p.get("before"));
  if (since) q = q.gte("created_at", since);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const out = page(data ?? [], limit);
  return apiJson({ ...out, data: out.data.map(orderJson) });
});
