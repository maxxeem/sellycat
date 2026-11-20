import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { postPublic } from "@/lib/net/safe-fetch";
import { nextAttempt, shortError, signature } from "./rules";

/**
 * Webhook delivery. Events are written by database triggers at commit; this sends the due ones
 * (claimed in SQL, so never twice in parallel), signs them and schedules retries. Runs right after
 * a change (`kickWebhooks`), on "send again" and daily in the cron.
 */

type Admin = ReturnType<typeof createAdminClient>;

export type WebhookBody = { id: string; type: string; created_at: string; data: unknown };

async function sendOne(admin: Admin, d: { id: string; endpoint_id: string; event_id: string; attempts: number }) {
  const [{ data: endpoint }, { data: event }] = await Promise.all([
    admin.from("webhook_endpoints").select("url, secret, enabled").eq("id", d.endpoint_id).maybeSingle(),
    admin.from("webhook_events").select("id, type, data, created_at").eq("id", d.event_id).maybeSingle(),
  ]);
  const attempts = d.attempts + 1;
  if (!endpoint || !event || !endpoint.enabled) {
    await admin.from("webhook_deliveries").update({ status: "failed", attempts, last_error: "endpoint disabled" }).eq("id", d.id);
    return false;
  }
  const body = JSON.stringify({ id: event.id, type: event.type, created_at: event.created_at, data: event.data } satisfies WebhookBody);
  let status: number | null = null;
  let error: string | null = null;
  try {
    const res = await postPublic(endpoint.url, body, {
      "sellycat-signature": signature(endpoint.secret, body, Math.floor(Date.now() / 1000)),
      "sellycat-event": event.type,
      "sellycat-delivery": d.id,
    });
    status = res.status;
    if (res.status < 200 || res.status >= 300) error = shortError(res.text) || `HTTP ${res.status}`;
  } catch (e) {
    error = shortError(e instanceof Error ? (e.name === "TimeoutError" ? "timeout" : e.message) : "failed");
  }
  if (!error) {
    await admin.from("webhook_deliveries").update({ status: "succeeded", attempts, last_status: status, last_error: null }).eq("id", d.id);
    return true;
  }
  // A test event is not retried (the person clicking sees the answer right away).
  const next = event.type === "ping" ? null : nextAttempt(attempts);
  await admin
    .from("webhook_deliveries")
    .update({ status: next ? "pending" : "failed", attempts, last_status: status, last_error: error, next_attempt_at: (next ?? new Date()).toISOString() })
    .eq("id", d.id);
  return false;
}

/** Sends due deliveries (all shops, or one). */
export async function flushWebhooks({ tenantId, limit = 25 }: { tenantId?: string; limit?: number } = {}): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("webhook_claim", { p_limit: limit, p_tenant: tenantId });
  if (error) throw new Error(`webhook_claim: ${error.message}`);
  let sent = 0;
  let failed = 0;
  // Small batches in parallel: one slow receiver must not hold up the others for long.
  const rows = data ?? [];
  for (let i = 0; i < rows.length; i += 5) {
    const results = await Promise.all(rows.slice(i, i + 5).map((d) => sendOne(admin, d).catch(() => false)));
    for (const ok of results) if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

/** After a change that may have produced events: deliver them once the response is out. */
export function kickWebhooks(tenantId?: string | null) {
  after(() => flushWebhooks({ tenantId: tenantId ?? undefined }).catch((e) => console.error("[webhooks]", e instanceof Error ? e.message : e)));
}

/** "Send test event": a `ping` straight to one endpoint (not depending on its event list). null = no such endpoint. */
export async function sendTestEvent(tenantId: string, endpointId: string): Promise<boolean | null> {
  const admin = createAdminClient();
  const { data: endpoint } = await admin.from("webhook_endpoints").select("id").eq("id", endpointId).eq("tenant_id", tenantId).maybeSingle();
  if (!endpoint) return null;
  const { data: event } = await admin
    .from("webhook_events")
    .insert({ tenant_id: tenantId, type: "ping", data: { message: "Test event from Sellycat" } })
    .select("id")
    .single();
  if (!event) return null;
  const { data: delivery } = await admin.from("webhook_deliveries").insert({ tenant_id: tenantId, endpoint_id: endpointId, event_id: event.id }).select("id, endpoint_id, event_id, attempts").single();
  if (!delivery) return null;
  await admin.from("webhook_deliveries").update({ status: "sending", last_attempt_at: new Date().toISOString() }).eq("id", delivery.id);
  return sendOne(admin, delivery);
}

/** "Send again": a delivery becomes due now (also after it was given up). */
export async function retryDelivery(tenantId: string, deliveryId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("webhook_deliveries")
    .update({ status: "pending", next_attempt_at: new Date().toISOString() })
    .eq("id", deliveryId)
    .eq("tenant_id", tenantId)
    .in("status", ["failed", "succeeded", "pending"])
    .select("id")
    .maybeSingle();
  if (!data) return false;
  await flushWebhooks({ tenantId, limit: 10 });
  return true;
}
