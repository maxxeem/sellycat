import { createAdminClient } from "@/lib/supabase/admin";
import { pdfResponse } from "@/lib/vouchers/pdf-response";

const UUID = /^[0-9a-f-]{36}$/;

/** All vouchers of an order as one PDF; needs the Stripe session id like the order page. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const session = new URL(request.url).searchParams.get("session_id");
  if (!UUID.test(id) || !session) return new Response("Not found", { status: 404 });
  const { data: order } = await createAdminClient().from("orders").select("stripe_session_id, status").eq("id", id).eq("tenant_id", tenant).maybeSingle();
  if (!order || order.stripe_session_id !== session || !["paid", "partially_refunded"].includes(order.status)) return new Response("Not found", { status: 404 });
  return pdfResponse(tenant, { orderId: id }, request);
}
