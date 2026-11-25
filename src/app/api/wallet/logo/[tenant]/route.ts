import { getShopProfile } from "@/lib/shop/queries";
import { loadImage } from "@/lib/vouchers/pdf";
import { googleLogoSource } from "@/lib/wallet/content";
import { googleRoundLogo, googleWideLogo } from "@/lib/wallet/images";

/** A shop's public logo as PNG for Google Wallet: ?kind=wide|round, wide with &on=dark|light. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  if (!/^[0-9a-f-]{36}$/.test(tenant)) return new Response("Not found", { status: 404 });
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind") === "round" ? "round" : "wide";
  const shop = await getShopProfile(tenant);
  const image = shop ? await loadImage(googleLogoSource(shop.theme, kind, q.get("on") === "dark"), 1280, "png") : null;
  if (!image) return new Response("Not found", { status: 404 });
  const png = kind === "round" ? await googleRoundLogo(image.data) : await googleWideLogo(image.data);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=2592000" } });
}
