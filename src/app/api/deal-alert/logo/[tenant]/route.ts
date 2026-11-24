import { getShopProfile } from "@/lib/shop/queries";
import { headerLogo } from "@/lib/shop/theme";
import { loadImage } from "@/lib/vouchers/pdf";

/** The shop's header logo as PNG for mails (clients show no SVG). `?v=` changes with the logo. */
export async function GET(_: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const shop = await getShopProfile((await params).tenant);
  const image = shop ? await loadImage(headerLogo(shop.theme) || null, 440, "png") : null;
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.data), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=2592000" } });
}
