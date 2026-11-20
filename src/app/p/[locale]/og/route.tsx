import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/locales";

const size = { width: 1200, height: 630 };

/**
 * Share image of the landing page (/og on sellycat.com, language from the path): Ink ground, a coral
 * glow, the on-dark logo and the claim. A route handler rather than opengraph-image.tsx (see CLAUDE.md,
 * Cache-Components-Fallen).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const t = getDictionary(isLocale(raw) ? raw : "de").site.meta;
  const [bold, regular, logo] = await Promise.all([
    readFile(path.join(process.cwd(), "src/app/fonts/Inter-Bold.ttf")),
    readFile(path.join(process.cwd(), "src/app/fonts/Inter-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/brand/sellycat-on-dark-1024.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#111111", color: "#ffffff", fontFamily: "Inter", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -260, top: -220, width: 820, height: 820, borderRadius: 999, background: "#582216", opacity: 0.85, filter: "blur(120px)" }} />
        <div style={{ position: "absolute", right: -200, bottom: -300, width: 700, height: 700, borderRadius: 999, background: "#FF4B23", opacity: 0.22, filter: "blur(140px)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={logoSrc} alt="" width={300} height={78} style={{ width: 300, height: 78, objectFit: "contain", objectPosition: "left" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", maxWidth: 940 }}>{t.ogClaim}</div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: "rgba(255,255,255,0.7)", maxWidth: 900 }}>{t.ogTitle}</div>
          </div>
          <div style={{ display: "flex", width: 120, height: 8, borderRadius: 8, background: "#FF4B23" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: bold, weight: 700, style: "normal" },
        { name: "Inter", data: regular, weight: 400, style: "normal" },
      ],
      headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
