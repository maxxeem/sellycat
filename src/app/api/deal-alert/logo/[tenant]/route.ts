import { getShopProfile } from "@/lib/shop/queries";
import { headerLogo } from "@/lib/shop/theme";
import { boxLogo } from "@/lib/mail/logo";
import { lightLogo } from "@/lib/vouchers/data";
import { loadImage } from "@/lib/vouchers/pdf";

/** The shop's logo as PNG for mails (clients show no SVG): for its header band, or `?on=light` for white. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const shop = await getShopProfile((await params).tenant);
  const logo = shop ? (new URL(request.url).searchParams.get("on") === "light" ? lightLogo(shop) : headerLogo(shop.theme)) : null;
  const image = await loadImage(logo || null, 1200, "png");
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await boxLogo(image.data)), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=2592000" } });
}
