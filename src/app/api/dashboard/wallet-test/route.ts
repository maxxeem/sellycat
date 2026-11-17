import { NextResponse } from "next/server";
import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { buildApplePass } from "@/lib/wallet/apple";
import { googleSaveUrl } from "@/lib/wallet/google";
import { loadWalletDesign, walletShop } from "@/lib/wallet/passes";
import { sampleVoucher } from "@/lib/wallet/sample";

/** Test pass with a sample code and the saved design (editor and up): ?platform=apple|google. */
export async function GET(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant || !roleAtLeast(tenant.role, "editor")) return new Response("Not found", { status: 404 });
  const platform = new URL(request.url).searchParams.get("platform");
  const sample = await sampleVoucher(tenant.id);
  if (!sample) return new Response("Not found", { status: 404 });
  const design = await loadWalletDesign(tenant.id);
  const shop = walletShop(sample.shop, sample.host, design);
  if (platform === "apple") {
    const file = await buildApplePass(sample.voucher, shop, design, null);
    if (!file) return new Response("Apple Wallet not configured", { status: 503 });
    return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.apple.pkpass", "Content-Disposition": 'attachment; filename="test.pkpass"', "Cache-Control": "private, no-store" } });
  }
  if (platform === "google") {
    const origin = new URL(request.url).origin;
    const save = await googleSaveUrl(sample.voucher, shop, design, [origin]);
    if (!save) return new Response("Google Wallet not configured", { status: 503 });
    return NextResponse.redirect(save.url, 303);
  }
  return new Response("Not found", { status: 404 });
}
