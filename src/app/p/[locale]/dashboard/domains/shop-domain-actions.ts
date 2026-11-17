"use server";

import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { addShopDomain, checkShopDomain, removeShopDomain, setPrimaryDomain, type DomainActionError, type DomainState } from "@/lib/site/shop-domains";

/** The shop's own web domains (owner/admin; plan feature `custom_domain`). */
export type ShopDomainResult = { ok: true; status?: DomainState } | { ok: false; error: DomainActionError };

const done = (tenantId: string) => {
  refreshShop(tenantId);
  revalidatePath("/p/[locale]/dashboard/domains", "page");
};

export async function addDomain(input: string, www: boolean): Promise<ShopDomainResult> {
  const { tenant } = await requireTenant("admin");
  const r = await addShopDomain(tenant.id, input, www);
  done(tenant.id);
  return r.ok ? { ok: true } : r;
}

export async function checkDomain(hostname: string): Promise<ShopDomainResult> {
  const { tenant } = await requireTenant("admin");
  const r = await checkShopDomain(tenant.id, hostname);
  done(tenant.id);
  return r;
}

export async function makePrimary(hostname: string): Promise<ShopDomainResult> {
  const { tenant } = await requireTenant("admin");
  const ok = await setPrimaryDomain(tenant.id, hostname);
  done(tenant.id);
  return ok ? { ok: true } : { ok: false, error: "failed" };
}

export async function removeDomain(hostname: string): Promise<ShopDomainResult> {
  const { tenant } = await requireTenant("admin");
  const ok = await removeShopDomain(tenant.id, hostname);
  done(tenant.id);
  return ok ? { ok: true } : { ok: false, error: "not_found" };
}
