import { getShopProfile } from "@/lib/shop/queries";
import { headerLogo } from "@/lib/shop/theme";
import { boxLogo, mailLogoUrl } from "@/lib/mail/logo";
import { lightLogo } from "@/lib/vouchers/data";
import { loadImage } from "@/lib/vouchers/pdf";

/** The shop's logo as PNG for mails (clients show no SVG): for its header band, or `?on=light` for white. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const shop = await getShopProfile((await params).tenant);
  const { origin, searchParams } = new URL(request.url);
  const on = searchParams.get("on") === "light" ? "light" : "band";
  const logo = shop ? (on === "light" ? lightLogo(shop) : headerLogo(shop.theme)) : null;
  // Only the address from our own mails (or the one of older mails, without the part "on"): other
  // values would each be drawn anew.
  const current = shop && logo ? mailLogoUrl(origin, shop.id, logo, on) : null;
  if (!current) return new Response("Not found", { status: 404 });
  if (new URL(current).search !== new URL(request.url).search) return Response.redirect(current, 302);
  const image = await loadImage(logo || null, 1200, "png");
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await boxLogo(image.data)), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=2592000" } });
}
