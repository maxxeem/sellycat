import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopProfile } from "@/lib/shop/queries";
import { loadVouchers, type LoadedVoucher } from "@/lib/vouchers/data";
import { pushPassUpdates } from "./apns";
import { buildApplePass } from "./apple";
import { appleConfig, googleConfig } from "./config";
import { parseWalletDesign, walletColors, type WalletDesign, type WalletShop, type WalletVoucher } from "./content";
import { googleSaveUrl, updateGoogleObject } from "./google";

/** Wallet passes of vouchers (service role; callers prove access with the voucher token). */
export const walletAvailable = () => ({ apple: appleConfig() !== null, google: googleConfig() !== null });

export async function loadWalletDesign(tenantId: string): Promise<WalletDesign> {
  const { data } = await createAdminClient().from("wallet_designs").select("background, foreground, label, show_image, show_locations").eq("tenant_id", tenantId).maybeSingle();
  return data ? parseWalletDesign({ background: data.background, foreground: data.foreground, label: data.label, showImage: data.show_image, showLocations: data.show_locations }) : parseWalletDesign(null);
}

export const toWalletVoucher = (v: LoadedVoucher): WalletVoucher => ({
  id: v.id,
  title: v.title,
  partner: v.partner,
  code: v.code,
  codeFormat: v.codeFormat,
  barcodeType: v.barcodeType,
  link: v.link,
  status: v.status === "valid" && v.validUntil && new Date(v.validUntil) <= new Date() ? "expired" : v.status,
  valueCents: v.valueCents,
  remainingCents: v.remainingCents,
  currency: v.currency,
  validUntil: v.validUntil,
  terms: v.terms,
  image: v.image,
  locations: v.locations,
});

/** The pass shows the logo made for its background (light text → logo for dark backgrounds). */
export function walletShop(shop: ShopProfile, host: string, design: WalletDesign): WalletShop & { iconUrl: string | null } {
  const darkBg = walletColors(design, shop.theme.colors.primary).foreground === "#ffffff";
  const logo = darkBg ? shop.theme.logoDark || shop.theme.logoLight || null : shop.theme.logoLight || shop.theme.logoDark || null;
  return { id: shop.id, name: shop.name, locale: shop.locale, host, primary: shop.theme.colors.primary, logo, iconUrl: shop.theme.favicon || null };
}

/** Row with the secret Apple uses to fetch updates (created on first download). */
async function ensurePass(voucherId: string, tenantId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("wallet_passes").select("auth_token").eq("voucher_id", voucherId).maybeSingle();
  if (data) return data.auth_token;
  const auth = randomBytes(24).toString("base64url");
  await db.from("wallet_passes").upsert({ voucher_id: voucherId, tenant_id: tenantId, auth_token: auth }, { onConflict: "voucher_id", ignoreDuplicates: true });
  const { data: again } = await db.from("wallet_passes").select("auth_token").eq("voucher_id", voucherId).single();
  return again?.auth_token ?? auth;
}

async function bundleByToken(tenantId: string, token: string, host: string) {
  const bundle = await loadVouchers(tenantId, { token }, host);
  const v = bundle?.vouchers[0];
  if (!bundle || !v) return null;
  const design = await loadWalletDesign(tenantId);
  return { bundle, voucher: toWalletVoucher(v), design, shop: walletShop(bundle.shop, bundle.host, design) };
}

export async function applePassFile(tenantId: string, token: string, host: string): Promise<{ file: Buffer; name: string } | null> {
  const b = await bundleByToken(tenantId, token, host);
  if (!b) return null;
  const auth = await ensurePass(b.voucher.id, tenantId);
  const file = await buildApplePass(b.voucher, b.shop, b.design, auth);
  return file ? { file, name: `${b.bundle.shop.slug}-${b.voucher.code}`.replace(/[^\w.-]+/g, "-") } : null;
}

/** The current pass for Apple's web service (serial = voucher id, checked against its token). */
export async function applePassBySerial(serial: string, authToken: string): Promise<{ file: Buffer; updatedAt: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(serial)) return null;
  const db = createAdminClient();
  const { data: pass } = await db.from("wallet_passes").select("auth_token, tenant_id, updated_at").eq("voucher_id", serial).maybeSingle();
  if (!pass || pass.auth_token !== authToken) return null;
  const { data: v } = await db.from("vouchers").select("token").eq("id", serial).single();
  if (!v) return null;
  const b = await bundleByToken(pass.tenant_id, v.token, "");
  if (!b) return null;
  const file = await buildApplePass(b.voucher, b.shop, b.design, pass.auth_token);
  return file ? { file, updatedAt: pass.updated_at } : null;
}

export async function googleLink(tenantId: string, token: string, host: string): Promise<string | null> {
  const b = await bundleByToken(tenantId, token, host);
  if (!b) return null;
  const save = await googleSaveUrl(b.voucher, b.shop, b.design, [`https://${b.bundle.host}`]);
  if (!save) return null;
  await ensurePass(b.voucher.id, tenantId);
  await createAdminClient().from("wallet_passes").update({ google_object_id: save.objectId }).eq("voucher_id", b.voucher.id);
  return save.url;
}

/**
 * After a redemption, undo, void, refund or expiry: marks the passes as changed, pushes to the
 * iPhones that hold them and updates the Google objects. Never throws (runs after the response).
 */
export async function walletUpdate(voucherIds: string[]): Promise<void> {
  if (!voucherIds.length) return;
  try {
    const db = createAdminClient();
    const { data: passes } = await db.from("wallet_passes").select("voucher_id, tenant_id, google_object_id").in("voucher_id", voucherIds);
    if (!passes?.length) return;
    const ids = passes.map((p) => p.voucher_id);
    await db.from("wallet_passes").update({ updated_at: new Date().toISOString() }).in("voucher_id", ids);

    const { data: regs } = await db.from("wallet_registrations").select("device_id, wallet_devices(push_token)").in("voucher_id", ids);
    const tokens = (regs ?? []).map((r) => r.wallet_devices?.push_token).filter((t): t is string => Boolean(t));
    const { gone } = await pushPassUpdates(tokens);
    if (gone.length) await db.from("wallet_devices").delete().in("push_token", gone);

    for (const p of passes.filter((x) => x.google_object_id)) {
      const { data: v } = await db.from("vouchers").select("token").eq("id", p.voucher_id).single();
      const b = v ? await bundleByToken(p.tenant_id, v.token, "") : null;
      if (b) await updateGoogleObject(b.voucher, b.shop, b.design);
    }
  } catch (e) {
    console.error("[wallet] update", e instanceof Error ? e.message : e);
  }
}

/** Cron: passes of vouchers that expired in the last two days get their final state. */
export async function refreshExpiredPasses(): Promise<number> {
  const now = Date.now();
  const { data } = await createAdminClient()
    .from("vouchers")
    .select("id, wallet_passes!inner(voucher_id)")
    .eq("status", "valid")
    .gt("valid_until", new Date(now - 2 * 86_400_000).toISOString())
    .lte("valid_until", new Date(now).toISOString())
    .limit(500);
  const ids = (data ?? []).map((v) => v.id);
  await walletUpdate(ids);
  return ids.length;
}
