import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleConfig } from "./config";

/**
 * Apple Wallet web service (developer.apple.com: "Wallet web service"): devices register for
 * passes, ask which ones changed and fetch them again. Every call is checked against the pass's
 * own token ("Authorization: ApplePass <token>").
 */
export const authToken = (request: Request) => request.headers.get("authorization")?.match(/^ApplePass\s+(\S+)$/)?.[1] ?? null;
export const validPassType = (passType: string) => appleConfig()?.passTypeIdentifier === passType;
export const validSerial = (s: string) => /^[0-9a-f-]{36}$/.test(s);
export const validDevice = (d: string) => /^[\w.-]{1,200}$/.test(d);

/** Token of the pass, if serial and token match. */
export async function checkPass(serial: string, token: string | null): Promise<{ tenantId: string } | null> {
  if (!token || !validSerial(serial)) return null;
  const { data } = await createAdminClient().from("wallet_passes").select("auth_token, tenant_id").eq("voucher_id", serial).maybeSingle();
  return data && data.auth_token === token ? { tenantId: data.tenant_id } : null;
}

export async function registerDevice(device: string, pushToken: string, serial: string, tenantId: string): Promise<"created" | "exists"> {
  const db = createAdminClient();
  await db.from("wallet_devices").upsert({ device_id: device, push_token: pushToken.slice(0, 400), updated_at: new Date().toISOString() }, { onConflict: "device_id" });
  const { data } = await db.from("wallet_registrations").select("device_id").eq("device_id", device).eq("voucher_id", serial).maybeSingle();
  if (data) return "exists";
  await db.from("wallet_registrations").insert({ device_id: device, voucher_id: serial, tenant_id: tenantId });
  return "created";
}

export async function unregisterDevice(device: string, serial: string): Promise<void> {
  const db = createAdminClient();
  await db.from("wallet_registrations").delete().eq("device_id", device).eq("voucher_id", serial);
  const { count } = await db.from("wallet_registrations").select("device_id", { count: "exact", head: true }).eq("device_id", device);
  if (!count) await db.from("wallet_devices").delete().eq("device_id", device);
}

/** Serial numbers on this device changed since the given tag (milliseconds). */
export async function changedSince(device: string, since: string | null): Promise<{ serialNumbers: string[]; lastUpdated: string } | null> {
  const db = createAdminClient();
  const { data: regs } = await db.from("wallet_registrations").select("voucher_id").eq("device_id", device);
  const ids = (regs ?? []).map((r) => r.voucher_id);
  if (!ids.length) return null;
  let q = db.from("wallet_passes").select("voucher_id, updated_at").in("voucher_id", ids);
  const sinceMs = since && /^\d{1,16}$/.test(since) ? Number(since) : null;
  if (sinceMs !== null) q = q.gt("updated_at", new Date(sinceMs).toISOString());
  const { data } = await q;
  if (!data?.length) return null;
  const last = Math.max(...data.map((p) => new Date(p.updated_at).getTime()));
  return { serialNumbers: data.map((p) => p.voucher_id), lastUpdated: String(last) };
}
