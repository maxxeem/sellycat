import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatMoney, isTeaser, savingsPercent } from "@/lib/shop/deal-status";
import { getDictionary } from "@/lib/i18n";
import { loadImage } from "@/lib/vouchers/pdf";
import { getShopDeal, getShopProfile } from "@/lib/shop/queries";

const size = { width: 1200, height: 630 };

/**
 * Social share image per deal (/og/<slug> on the shop host): cover image, title, price and savings
 * in the shop's colours. A route handler rather than opengraph-image.tsx, whose implicit metadata
 * would make every deal page wait for request data.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string; slug: string }> }) {
  const { tenant, slug } = await params;
  const [shop, deal, bold] = await Promise.all([
    getShopProfile(tenant),
    getShopDeal(tenant, slug),
    readFile(path.join(process.cwd(), "src/app/fonts/Inter-Bold.ttf")),
  ]);
  // Only real deals are drawn (nothing to burn computing time with), and only pictures from our own storage.
  if (!shop || !deal) return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=300, s-maxage=300" } });
  const picture = await loadImage(deal.images[0]?.url ?? null, 900, "jpeg");
  const c = shop?.theme.colors ?? { primary: "#ff4b23", text: "#111111", background: "#ffffff" };
  const teaser = deal ? isTeaser(deal, new Date()) : false;
  const savings = deal && !teaser ? savingsPercent(deal.price_cents, deal.compare_at_cents) : null;
  const cover = picture ? `data:image/jpeg;base64,${picture.data.toString("base64")}` : null;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: c.background, color: c.text, fontFamily: "Inter" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>
          <img src={cover} alt="" width={630} height={630} style={{ width: 630, height: 630, objectFit: "cover" }} />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 56, flex: 1, gap: 20 }}>
          <div style={{ fontSize: 28, opacity: 0.7 }}>{deal?.partner?.name ?? shop?.name ?? ""}</div>
          <div style={{ fontSize: cover ? 52 : 72, lineHeight: 1.1 }}>{deal?.title ?? shop?.name ?? ""}</div>
          {deal ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
              <div style={{ fontSize: teaser ? 40 : 56 }}>{teaser ? getDictionary(shop?.locale ?? "de").shop.teaserLabel : formatMoney(deal.price_cents, shop?.currency ?? "CHF", shop?.locale ?? "de")}</div>
              {savings ? (
                <div style={{ display: "flex", background: c.primary, color: "#111111", borderRadius: 999, padding: "8px 24px", fontSize: 36 }}>-{savings}%</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: bold, weight: 700, style: "normal" }], headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
