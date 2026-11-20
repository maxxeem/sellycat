"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/dashboard/context";
import { isDay } from "@/lib/settlements/period";
import { createSettlements, loadSettlement, sendSettlement, setStatus } from "@/lib/settlements/settlements";

export type SettleResult = { ok: boolean; count?: number; email?: string; error?: "email" | "state" | "failed" };

const refresh = () => revalidatePath("/p/[locale]/dashboard/settlements", "layout");

export async function createAll(until: string, partnerId?: string): Promise<SettleResult> {
  const { tenant } = await requireTenant("admin");
  if (!isDay(until)) return { ok: false, error: "failed" };
  try {
    const count = await createSettlements(tenant.id, until, partnerId ? [partnerId] : undefined);
    refresh();
    return { ok: true, count };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/** A draft again with everything open up to its end date. */
export async function recreate(id: string): Promise<SettleResult> {
  const { tenant } = await requireTenant("admin");
  const found = await loadSettlement(tenant.id, id);
  if (!found || found.s.status !== "draft" || !found.s.partner_id) return { ok: false, error: "state" };
  return createAll(found.s.period_to, found.s.partner_id);
}

export async function changeStatus(id: string, status: "final" | "paid" | "deleted"): Promise<SettleResult> {
  await requireTenant("admin");
  const ok = await setStatus(id, status);
  refresh();
  return ok ? { ok } : { ok, error: "failed" };
}


export async function send(id: string): Promise<SettleResult> {
  const { tenant } = await requireTenant("admin");
  const r = await sendSettlement(tenant.id, id);
  refresh();
  return r;
}
