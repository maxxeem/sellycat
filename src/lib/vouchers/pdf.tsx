import "server-only";
/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is not an HTML img (no alt attribute) */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { fmt, getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/shop/deal-status";
import { voucherSymbol, type BarcodeType, type CodeFormat } from "./symbol";

/**
 * Voucher PDF (A4, one page per voucher): shop logo, deal image, title, code with QR/barcode,
 * value, validity, where to redeem and the terms, in the shop's main colour. Part 3 adds
 * templates; this is the default layout.
 */
export type PdfVoucher = {
  title: string;
  subtitle: string | null;
  partner: string | null;
  code: string;
  codeFormat: CodeFormat;
  barcodeType: BarcodeType | null;
  link: string;
  status: "valid" | "redeemed" | "expired" | "refunded" | "void";
  valueCents: number | null;
  remainingCents: number | null;
  currency: string;
  validUntil: string | null;
  terms: string | null;
  image: string | null;
  locations: Array<{ name: string; street: string | null; zip: string | null; city: string | null }>;
};
export type PdfInput = {
  shopName: string;
  locale: "de" | "en";
  primary: string;
  logoUrl: string | null;
  host: string;
  orderNumber: string | null;
  gift: { from: string | null; message: string | null } | null;
  vouchers: PdfVoucher[];
};

let fontsReady: Promise<void> | null = null;
function registerFonts() {
  fontsReady ??= (async () => {
    const dir = path.join(process.cwd(), "src/app/fonts");
    const [regular, semibold, bold] = await Promise.all(["Inter-Regular.ttf", "Inter-SemiBold.ttf", "Inter-Bold.ttf"].map((f) => readFile(path.join(dir, f))));
    const uri = (b: Buffer) => `data:font/ttf;base64,${b.toString("base64")}`;
    Font.register({ family: "Inter", fonts: [{ src: uri(regular) }, { src: uri(semibold), fontWeight: 600 }, { src: uri(bold), fontWeight: 700 }] });
    Font.registerHyphenationCallback((word) => [word]);
  })();
  return fontsReady;
}

/** Only our own storage is fetched (no requests to arbitrary hosts). */
function allowedImage(url: string | null): url is string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && base && url.startsWith(`${base.replace(/\/$/, "")}/storage/v1/object/public/`));
}

type Loaded = { data: Buffer; width: number; height: number };

/** Any stored image (WebP, SVG, PNG, JPEG) → PNG/JPEG that the PDF can embed, with its size. */
async function loadImage(url: string | null, width: number, format: "jpeg" | "png"): Promise<Loaded | null> {
  if (!allowedImage(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length > 15_000_000) return null;
    const img = sharp(input, { density: 300, limitInputPixels: 50_000_000 }).rotate().resize({ width, withoutEnlargement: true });
    const out = format === "png" ? img.png() : img.flatten({ background: "#ffffff" }).jpeg({ quality: 82 });
    const { data, info } = await out.toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** Logo box: at most 170 × 40 pt, aspect kept, so it sits flush left. */
function logoSize(l: Loaded) {
  const scale = Math.min(170 / l.width, 40 / l.height);
  return { width: l.width * scale, height: l.height * scale };
}

async function symbolPng(v: PdfVoucher): Promise<{ png: Buffer; kind: "qr" | "linear" | "matrix" } | null> {
  const s = voucherSymbol({ codeFormat: v.codeFormat, barcodeType: v.barcodeType, code: v.code, link: v.link });
  if (!s) return null;
  const png = await sharp(Buffer.from(s.svg), { density: 600 }).flatten({ background: "#ffffff" }).png().toBuffer();
  return { png, kind: s.kind };
}

const dateText = (iso: string, locale: "de" | "en") =>
  new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#111111", paddingTop: 36, paddingHorizontal: 40, paddingBottom: 64 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  shopName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#6b6b70" },
  cover: { width: "100%", height: 220, objectFit: "cover", borderRadius: 12, marginBottom: 18 },
  partner: { fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#6b6b70", marginBottom: 3 },
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.2 },
  subtitle: { fontSize: 11, color: "#3f3f46", marginTop: 4 },
  gift: { marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: "#f4f4f5" },
  card: { marginTop: 18, borderRadius: 14, borderWidth: 1.5, padding: 18, flexDirection: "row", gap: 18, alignItems: "center" },
  label: { fontSize: 8, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#6b6b70" },
  code: { fontFamily: "Courier-Bold", fontSize: 21, letterSpacing: 1, marginTop: 3 },
  section: { marginTop: 18 },
  h: { fontSize: 11, fontWeight: 700, marginBottom: 5 },
  small: { fontSize: 8.5, lineHeight: 1.45, color: "#3f3f46" },
  stamp: { marginTop: 8, alignSelf: "flex-start", fontSize: 9, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "#fee2e2", color: "#991b1b" },
  footer: { position: "absolute", left: 40, right: 40, bottom: 26, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#6b6b70", borderTopWidth: 0.5, borderTopColor: "#d4d4d8", paddingTop: 8 },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 6 },
});

export async function renderVoucherPdf(input: PdfInput): Promise<Buffer> {
  await registerFonts();
  const t = getDictionary(input.locale);
  const p = t.mail.pdf;
  const [logo, ...prepared] = await Promise.all([
    loadImage(input.logoUrl, 600, "png"),
    ...input.vouchers.map(async (v) => ({ v, cover: await loadImage(v.image, 1400, "jpeg"), symbol: await symbolPng(v) })),
  ]);
  const money = (c: number, cur: string) => formatMoney(c, cur, input.locale);
  const primary = /^#[0-9a-f]{6}$/i.test(input.primary) ? input.primary : "#ff4b23";

  const doc = (
    <Document title={input.vouchers[0]?.title ?? input.shopName} author={input.shopName} creator="Sellycat" producer="Sellycat" language={input.locale}>
      {(prepared as Array<{ v: PdfVoucher; cover: Loaded | null; symbol: Awaited<ReturnType<typeof symbolPng>> }>).map(({ v, cover, symbol }, n) => {
        const size = symbol?.kind === "linear" ? { width: 190, height: 90 } : { width: 128, height: 128 };
        return (
          <Page key={n} size="A4" style={s.page}>
            <View style={[s.bar, { backgroundColor: primary }]} fixed />
            <View style={s.head}>
              {logo ? <Image src={{ data: logo.data, format: "png" }} style={logoSize(logo)} /> : <Text style={s.shopName}>{input.shopName}</Text>}
              {input.orderNumber ? <Text style={s.muted}>{fmt(p.order, { number: input.orderNumber })}</Text> : null}
            </View>
            {cover ? <Image src={{ data: cover.data, format: "jpg" }} style={s.cover} /> : null}
            {v.partner ? <Text style={s.partner}>{v.partner}</Text> : null}
            <Text style={s.title}>{v.title}</Text>
            {v.subtitle ? <Text style={s.subtitle}>{v.subtitle}</Text> : null}
            {input.gift && (input.gift.from || input.gift.message) ? (
              <View style={s.gift}>
                {input.gift.from ? <Text style={{ fontWeight: 700 }}>{fmt(t.shop.giftFromLabel, { name: input.gift.from })}</Text> : null}
                {input.gift.message ? <Text style={{ marginTop: input.gift.from ? 4 : 0, fontStyle: "italic", lineHeight: 1.4 }}>{input.gift.message}</Text> : null}
              </View>
            ) : null}
            <View style={[s.card, { borderColor: primary }]} wrap={false}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{p.code}</Text>
                <Text style={s.code}>{v.code}</Text>
                {v.valueCents ? (
                  <Text style={{ marginTop: 10, fontSize: 12, fontWeight: 600 }}>
                    {p.value}: {money(v.valueCents, v.currency)}
                    {v.remainingCents !== null && v.remainingCents !== v.valueCents ? `  (${fmt(t.shop.voucherRemaining, { value: money(v.remainingCents, v.currency), total: money(v.valueCents, v.currency) })})` : ""}
                  </Text>
                ) : null}
                <Text style={{ marginTop: 4 }}>{v.validUntil ? fmt(t.shop.voucherValidUntil, { date: dateText(v.validUntil, input.locale) }) : t.shop.voucherNoExpiry}</Text>
                <Text style={[s.small, { marginTop: 8 }]}>{p.scan}</Text>
                {v.status !== "valid" ? <Text style={s.stamp}>{t.shop.voucherStatus[v.status]}</Text> : null}
              </View>
              {symbol ? (
                <View style={{ padding: 6, backgroundColor: "#ffffff", borderRadius: 8 }}>
                  <Image src={{ data: symbol.png, format: "png" }} style={size} />
                </View>
              ) : null}
            </View>
            {v.locations.length ? (
              <View style={s.section} wrap={false}>
                <Text style={s.h}>{p.redeemAt}</Text>
                {v.locations.slice(0, 6).map((l, i) => (
                  <Text key={i} style={s.small}>
                    <Text style={{ fontWeight: 600 }}>{l.name}</Text>
                    {[l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).length ? ` · ${[l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}` : ""}
                  </Text>
                ))}
              </View>
            ) : null}
            {v.terms?.trim() ? (
              <View style={s.section}>
                <Text style={s.h}>{p.terms}</Text>
                <Text style={s.small}>{v.terms.trim().slice(0, 2500)}</Text>
              </View>
            ) : null}
            <View style={s.footer} fixed>
              <Text>{input.shopName}</Text>
              <Text>{input.host}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
  return renderToBuffer(doc);
}
