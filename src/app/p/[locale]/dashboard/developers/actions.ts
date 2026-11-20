"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/dashboard/context";
import { createEndpoint, createKey, deleteEndpoint, revealSecret, revokeKey, rotateSecret, updateEndpoint, type DevError } from "@/lib/developers/manage";
import { retryDelivery, sendTestEvent } from "@/lib/developers/webhooks";

/** API keys and webhooks: owners and admins only (also checked per query by shop). */

export type DevResult = { ok: true; key?: string; secret?: string; delivered?: boolean } | { ok: false; error: DevError };

const refresh = () => revalidatePath("/p/[locale]/dashboard/developers", "page");

async function admin() {
  const { tenant, user } = await requireTenant("admin");
  return { tenantId: tenant.id, userId: user.id };
}

export async function addKey(input: { name: string; scopes: string[] }): Promise<DevResult> {
  const { tenantId, userId } = await admin();
  const r = await createKey(tenantId, userId, input);
  refresh();
  return r;
}

export async function removeKey(id: string): Promise<DevResult> {
  const { tenantId } = await admin();
  const r = await revokeKey(tenantId, id);
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: "not_found" };
}

export async function addEndpoint(input: { url: string; description: string; events: string[] }): Promise<DevResult> {
  const { tenantId, userId } = await admin();
  const r = await createEndpoint(tenantId, userId, input);
  refresh();
  return r;
}

export async function changeEndpoint(id: string, patch: { enabled?: boolean; events?: string[] }): Promise<DevResult> {
  const { tenantId } = await admin();
  const r = await updateEndpoint(tenantId, id, patch);
  refresh();
  return r;
}

export async function removeEndpoint(id: string): Promise<DevResult> {
  const { tenantId } = await admin();
  const r = await deleteEndpoint(tenantId, id);
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: "not_found" };
}

export async function showSecret(id: string): Promise<DevResult> {
  const { tenantId } = await admin();
  const secret = await revealSecret(tenantId, id);
  return secret ? { ok: true, secret } : { ok: false, error: "not_found" };
}

export async function newSecret(id: string): Promise<DevResult> {
  const { tenantId } = await admin();
  const secret = await rotateSecret(tenantId, id);
  return secret ? { ok: true, secret } : { ok: false, error: "not_found" };
}

export async function testEndpoint(id: string): Promise<DevResult> {
  const { tenantId } = await admin();
  const delivered = await sendTestEvent(tenantId, id);
  refresh();
  return delivered === null ? { ok: false, error: "not_found" } : { ok: true, delivered };
}

export async function resendDelivery(id: string): Promise<DevResult> {
  const { tenantId } = await admin();
  const ok = await retryDelivery(tenantId, id);
  refresh();
  return ok ? { ok: true } : { ok: false, error: "not_found" };
}
