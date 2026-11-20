import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { API_SCOPES, cleanWebhookUrl, hashKey, isWebhookEvent, keyPrefix, newApiKey, newWebhookSecret, type ApiScope, type WebhookEvent } from "./rules";

/**
 * Dashboard → API & webhooks (owners/admins; callers check the role first). Rows are written only
 * here with the service role: keys as hash, secrets readable only through `revealSecret`.
 */

export type DevError = "plan" | "name" | "scopes" | "url" | "https" | "host" | "events" | "limit" | "not_found" | "failed";

export type ApiKeyRow = { id: string; name: string; prefix: string; scopes: string[]; created_at: string; last_used_at: string | null; revoked_at: string | null };
export type EndpointRow = { id: string; url: string; description: string | null; events: string[]; enabled: boolean; created_at: string };
export type DeliveryRow = {
  id: string;
  endpoint_id: string;
  status: string;
  attempts: number;
  last_status: number | null;
  last_error: string | null;
  last_attempt_at: string | null;
  next_attempt_at: string;
  created_at: string;
  event: { id: string; type: string; data: unknown } | null;
};

const MAX_KEYS = 20;
const MAX_ENDPOINTS = 10;

async function allowed(tenantId: string) {
  const { data } = await createAdminClient().rpc("plan_allows", { p_tenant: tenantId, p_feature: "api" });
  return data === true;
}

export async function loadDevelopers(tenantId: string) {
  const db = createAdminClient();
  const [ok, keys, endpoints, deliveries] = await Promise.all([
    allowed(tenantId),
    db.from("api_keys").select("id, name, prefix, scopes, created_at, last_used_at, revoked_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    db.from("webhook_endpoints").select("id, url, description, events, enabled, created_at").eq("tenant_id", tenantId).order("created_at"),
    db
      .from("webhook_deliveries")
      .select("id, endpoint_id, status, attempts, last_status, last_error, last_attempt_at, next_attempt_at, created_at, event:webhook_events(id, type, data)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    allowed: ok,
    keys: (keys.data ?? []) as ApiKeyRow[],
    endpoints: (endpoints.data ?? []) as EndpointRow[],
    deliveries: (deliveries.data ?? []) as unknown as DeliveryRow[],
  };
}

export async function createKey(tenantId: string, userId: string, input: { name: string; scopes: string[] }): Promise<{ ok: true; key: string } | { ok: false; error: DevError }> {
  if (!(await allowed(tenantId))) return { ok: false, error: "plan" };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "name" };
  const scopes = API_SCOPES.filter((s) => input.scopes.includes(s)) as ApiScope[];
  if (!scopes.includes("read")) scopes.unshift("read");
  const db = createAdminClient();
  const { count } = await db.from("api_keys").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("revoked_at", null);
  if ((count ?? 0) >= MAX_KEYS) return { ok: false, error: "limit" };
  const key = newApiKey();
  const { error } = await db.from("api_keys").insert({ tenant_id: tenantId, name, prefix: keyPrefix(key), key_hash: hashKey(key), scopes, created_by: userId });
  return error ? { ok: false, error: "failed" } : { ok: true, key };
}

export async function revokeKey(tenantId: string, keyId: string): Promise<{ ok: boolean }> {
  const { data } = await createAdminClient().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId).eq("tenant_id", tenantId).is("revoked_at", null).select("id").maybeSingle();
  return { ok: Boolean(data) };
}

function cleanEvents(events: string[]): WebhookEvent[] {
  return [...new Set(events.filter(isWebhookEvent))];
}

export async function createEndpoint(tenantId: string, userId: string, input: { url: string; description: string; events: string[] }): Promise<{ ok: true } | { ok: false; error: DevError }> {
  if (!(await allowed(tenantId))) return { ok: false, error: "plan" };
  const url = cleanWebhookUrl(input.url);
  if (!url.ok) return { ok: false, error: url.error };
  const events = cleanEvents(input.events);
  if (!events.length) return { ok: false, error: "events" };
  const db = createAdminClient();
  const { count } = await db.from("webhook_endpoints").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if ((count ?? 0) >= MAX_ENDPOINTS) return { ok: false, error: "limit" };
  const { error } = await db.from("webhook_endpoints").insert({ tenant_id: tenantId, url: url.url, description: input.description.trim().slice(0, 120) || null, events, secret: newWebhookSecret(), created_by: userId });
  return error ? { ok: false, error: "failed" } : { ok: true };
}

export async function updateEndpoint(tenantId: string, id: string, patch: { enabled?: boolean; events?: string[] }): Promise<{ ok: true } | { ok: false; error: DevError }> {
  const row: { enabled?: boolean; events?: WebhookEvent[] } = {};
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.events) {
    row.events = cleanEvents(patch.events);
    if (!row.events.length) return { ok: false, error: "events" };
  }
  const { data } = await createAdminClient().from("webhook_endpoints").update(row).eq("id", id).eq("tenant_id", tenantId).select("id").maybeSingle();
  return data ? { ok: true } : { ok: false, error: "not_found" };
}

export async function deleteEndpoint(tenantId: string, id: string): Promise<{ ok: boolean }> {
  const { data } = await createAdminClient().from("webhook_endpoints").delete().eq("id", id).eq("tenant_id", tenantId).select("id").maybeSingle();
  return { ok: Boolean(data) };
}

export async function revealSecret(tenantId: string, id: string): Promise<string | null> {
  const { data } = await createAdminClient().from("webhook_endpoints").select("secret").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  return data?.secret ?? null;
}

/** New secret (the old one stops working immediately). */
export async function rotateSecret(tenantId: string, id: string): Promise<string | null> {
  const secret = newWebhookSecret();
  const { data } = await createAdminClient().from("webhook_endpoints").update({ secret }).eq("id", id).eq("tenant_id", tenantId).select("id").maybeSingle();
  return data ? secret : null;
}
