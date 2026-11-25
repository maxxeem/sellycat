import "server-only";
/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is not an HTML img (no alt attribute) */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Font, Image, Page, Path, Svg, Text, View } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { mix, readableOn } from "@/lib/design/color";
import { fmt, getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/shop/deal-status";
import { DEFAULT_DESIGN, activeAd, type VoucherDesign } from "./design";
import { symbolVector, voucherSymbol, type BarcodeType, type CodeFormat, type SymbolVector } from "./symbol";

/**
 * Voucher PDF, one page per voucher, in one of three layouts (classic, ticket, minimal) on A4 or
 * A6: shop logo, deal image, title, code with QR/barcode, value, validity, where to redeem, the
 * terms and an optional note, in the shop's colour or the design's own. With an advertising visual
 * the lower half of the page shows it; the voucher is then set smaller in the upper half and
 * whatever does not fit there continues on a further page (nothing is cut off).
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
  /** The deal's advertising: a visual, null = none, undefined = the shop's setting. */
  ad?: string | null;
  locations: Array<{ name: string; street: string | null; zip: string | null; city: string | null; lat?: number | null; lng?: number | null }>;
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
  design?: VoucherDesign;
};

let fontsReady: Promise<void> | null = null;
export function registerFonts() {
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
export async function loadImage(url: string | null, width: number, format: "jpeg" | "png"): Promise<Loaded | null> {
  if (!allowedImage(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length > 15_000_000) return null;
    const img = sharp(input, { density: 300, limitInputPixels: 50_000_000 }).rotate().resize({ width, withoutEnlargement: true });
    // Always true colour: palette PNGs (8-bit colormap) are drawn wrongly by the PDF engine.
    const out = format === "png" ? img.toColorspace("srgb").ensureAlpha().png({ palette: false }) : img.flatten({ background: "#ffffff" }).toColorspace("srgb").jpeg({ quality: 82 });
    const { data, info } = await out.toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** QR code or barcode as vector paths (sharp in print at any size). */
function symbolOf(v: PdfVoucher): { vector: SymbolVector; kind: "qr" | "linear" | "matrix" } | null {
  const s = voucherSymbol({ codeFormat: v.codeFormat, barcodeType: v.barcodeType, code: v.code, link: v.link });
  const vector = s ? symbolVector({ codeFormat: v.codeFormat, barcodeType: v.barcodeType, code: v.code, link: v.link }) : null;
  return s && vector ? { vector, kind: s.kind } : null;
}

const dateText = (iso: string, locale: "de" | "en") =>
  new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

/** Measures per paper size (points). */
const METRICS = {
  a4: { pad: 40, top: 36, bottom: 64, body: 10, small: 8.5, label: 8, title: 22, subtitle: 11, code: 21, cover: 220, qr: 128, linear: [190, 90], logo: [170, 40], gap: 18, terms: 2500, places: 6, radius: 12, footer: 8 },
  a6: { pad: 18, top: 16, bottom: 34, body: 7, small: 6, label: 5.6, title: 12.5, subtitle: 7.5, code: 12, cover: 84, qr: 62, linear: [110, 48], logo: [90, 20], gap: 7, terms: 420, places: 3, radius: 7, footer: 5.6 },
  a4ad: { pad: 34, top: 24, bottom: 448, body: 9, small: 7.2, label: 7, title: 17, subtitle: 9.5, code: 17, cover: 62, qr: 96, linear: [160, 70], logo: [130, 28], gap: 10, terms: 2500, places: 4, radius: 9, footer: 7 },
  a6ad: { pad: 14, top: 9, bottom: 222, body: 5.8, small: 5, label: 4.4, title: 8.5, subtitle: 5.6, code: 9, cover: 28, qr: 44, linear: [84, 34], logo: [64, 13], gap: 4.5, terms: 420, places: 2, radius: 5, footer: 4.4 },
} as const;
/** Conditions up to this length fit beside the note and the places. */
const AD_TERMS_BESIDE = 600;
/** Height of the advertising half (points). */
const AD_HEIGHT = { a4: 420.94, a6: 209.76 } as const;
type Metrics = (typeof METRICS)[keyof typeof METRICS];

const MUTED = "#6b6b70";
const SOFT = "#3f3f46";

type Prepared = { v: PdfVoucher; cover: Loaded | null; symbol: ReturnType<typeof symbolOf> };
type Ctx = {
  input: PdfInput;
  design: VoucherDesign;
  m: Metrics;
  accent: string;
  logo: Loaded | null;
  ad: Loaded | null;
  t: ReturnType<typeof getDictionary>;
  money: (c: number, cur: string) => string;
};

function logoBox(l: Loaded, m: Metrics) {
  const scale = Math.min(m.logo[0] / l.width, m.logo[1] / l.height);
  return { width: l.width * scale, height: l.height * scale };
}

/** All module rectangles as one path (same winding, so touching modules fill as one area). */
function symbolPath(v: SymbolVector): string {
  return v.rects.map(([x, y, w, h]) => `M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z`).join("");
}

/** Fits the symbol into its box without distorting it (QR codes stay exactly square). */
function symbolBox(kind: "qr" | "linear" | "matrix", vector: SymbolVector, m: Metrics) {
  const [w, h] = kind === "linear" ? m.linear : [m.qr, m.qr];
  const scale = Math.min(w / vector.width, h / vector.height);
  return { width: vector.width * scale, height: vector.height * scale };
}

// ------------------------------------------------------------------ shared blocks

function Logo({ c, color }: { c: Ctx; color?: string }) {
  return c.logo ? <Image src={{ data: c.logo.data, format: "png" }} style={logoBox(c.logo, c.m)} /> : <Text style={{ fontSize: c.m.title * 0.72, fontWeight: 700, color }}>{c.input.shopName}</Text>;
}

function Heading({ c, v, color = "#111111", muted = MUTED, align = "left" }: { c: Ctx; v: PdfVoucher; color?: string; muted?: string; align?: "left" | "center" }) {
  return (
    <View>
      {v.partner ? <Text style={{ fontSize: c.m.label + 1, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: muted, marginBottom: 3, textAlign: align }}>{v.partner}</Text> : null}
      <Text style={{ fontSize: c.m.title, fontWeight: 700, lineHeight: 1.2, color, textAlign: align }}>{v.title}</Text>
      {v.subtitle ? <Text style={{ fontSize: c.m.subtitle, color: muted === MUTED ? SOFT : muted, marginTop: 3, textAlign: align }}>{v.subtitle}</Text> : null}
    </View>
  );
}

/** Title block; next to the advertising half the deal image is a small picture beside it. */
function HeadingRow({ c, p, color, muted }: { c: Ctx; p: Prepared; color?: string; muted?: string }) {
  if (!c.ad || !c.design.showImage || !p.cover) return <Heading c={c} v={p.v} color={color} muted={muted} />;
  return (
    <View style={{ flexDirection: "row", gap: c.m.gap, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <Heading c={c} v={p.v} color={color} muted={muted} />
      </View>
      <Image src={{ data: p.cover.data, format: "jpg" }} style={{ width: c.m.cover * 1.5, height: c.m.cover, objectFit: "cover", borderRadius: c.m.radius * 0.7 }} />
    </View>
  );
}

/** The lower half of the page, edge to edge. */
function Ad({ c }: { c: Ctx }) {
  if (!c.ad) return null;
  return <Image src={{ data: c.ad.data, format: "jpg" }} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: AD_HEIGHT[c.design.size], objectFit: "cover" }} fixed />;
}

function Cover({ c, p, height }: { c: Ctx; p: Prepared; height?: number }) {
  if (!c.design.showImage || !p.cover) return null;
  return <Image src={{ data: p.cover.data, format: "jpg" }} style={{ width: "100%", height: height ?? c.m.cover, objectFit: "cover", borderRadius: c.m.radius }} />;
}

function Gift({ c }: { c: Ctx }) {
  const g = c.input.gift;
  if (!g || (!g.from && !g.message)) return null;
  // On half a page in one running line.
  if (c.ad)
    return (
      <View style={{ marginTop: c.m.gap * 0.75, paddingVertical: c.m.gap * 0.45, paddingHorizontal: c.m.gap * 0.65, borderRadius: c.m.radius * 0.8, backgroundColor: "#f4f4f5" }} wrap={false}>
        <Text>
          {g.from ? <Text style={{ fontWeight: 700 }}>{`${fmt(c.t.shop.giftFromLabel, { name: g.from })}  `}</Text> : null}
          {g.message ? <Text style={{ color: SOFT }}>{`«${g.message}»`}</Text> : null}
        </Text>
      </View>
    );
  return (
    <View style={{ marginTop: c.m.gap * 0.75, padding: c.m.gap * 0.65, borderRadius: c.m.radius * 0.8, backgroundColor: "#f4f4f5" }} wrap={false}>
      {g.from ? <Text style={{ fontWeight: 700 }}>{fmt(c.t.shop.giftFromLabel, { name: g.from })}</Text> : null}
      {g.message ? <Text style={{ marginTop: g.from ? 3 : 0, color: SOFT }}>{`«${g.message}»`}</Text> : null}
    </View>
  );
}

function CodeFacts({ c, v, align = "left" }: { c: Ctx; v: PdfVoucher; align?: "left" | "center" }) {
  const p = c.t.mail.pdf;
  return (
    <View>
      <Text style={{ fontSize: c.m.label, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTED, textAlign: align }}>{p.code}</Text>
      {/* Plain number/letter codes have no symbol: the code itself is what gets typed in, so larger. */}
      <Text style={{ fontFamily: "Courier-Bold", fontSize: v.codeFormat === "numeric" ? c.m.code * 1.35 : c.m.code, letterSpacing: 1, marginTop: 2, textAlign: align }}>{v.code}</Text>
      {v.valueCents ? (
        <Text style={{ marginTop: c.m.gap * 0.5, fontSize: c.m.body * 1.2, fontWeight: 600, textAlign: align }}>
          {p.value}: {c.money(v.valueCents, v.currency)}
          {v.remainingCents !== null && v.remainingCents !== v.valueCents ? `  (${fmt(c.t.shop.voucherRemaining, { value: c.money(v.remainingCents, v.currency), total: c.money(v.valueCents, v.currency) })})` : ""}
        </Text>
      ) : null}
      <Text style={{ marginTop: 3, textAlign: align }}>{v.validUntil ? fmt(c.t.shop.voucherValidUntil, { date: dateText(v.validUntil, c.input.locale) }) : c.t.shop.voucherNoExpiry}</Text>
      <Text style={{ fontSize: c.m.small, lineHeight: 1.45, color: SOFT, marginTop: c.m.gap * 0.4, textAlign: align }}>{v.codeFormat === "numeric" ? p.typeIn : p.scan}</Text>
      {v.status !== "valid" ? (
        <Text style={{ marginTop: 6, alignSelf: align === "center" ? "center" : "flex-start", fontSize: c.m.small + 0.5, fontWeight: 700, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, backgroundColor: "#fee2e2", color: "#991b1b" }}>
          {c.t.shop.voucherStatus[v.status]}
        </Text>
      ) : null}
    </View>
  );
}

function Symbol({ c, p }: { c: Ctx; p: Prepared }) {
  if (!p.symbol) return null;
  return (
    <View style={{ padding: c.m.gap * 0.3, backgroundColor: "#ffffff", borderRadius: c.m.radius * 0.6 }}>
      <Svg viewBox={`0 0 ${p.symbol.vector.width} ${p.symbol.vector.height}`} style={symbolBox(p.symbol.kind, p.symbol.vector, c.m)}>
        {/* One filled shape (not one per module): no hairline seams between rows in viewers. */}
        <Path d={symbolPath(p.symbol.vector)} fill="#000000" />
      </Svg>
    </View>
  );
}

function Details({ c, v }: { c: Ctx; v: PdfVoucher }) {
  const p = c.t.mail.pdf;
  const small = { fontSize: c.m.small, lineHeight: 1.45, color: SOFT };
  const h = { fontSize: c.m.subtitle, fontWeight: 700, marginBottom: 4 } as const;
  const places = c.design.showLocations ? v.locations.slice(0, c.m.places) : [];
  const terms = c.design.showTerms ? v.terms?.trim().slice(0, c.m.terms) : "";
  const note = c.design.note ? (
    <View style={{ marginTop: c.m.gap, paddingLeft: c.m.gap * 0.5, borderLeftWidth: 2.5, borderLeftColor: c.accent }} wrap={false}>
      <Text style={{ fontSize: c.m.body, lineHeight: 1.45, fontWeight: 600 }}>{c.design.note}</Text>
    </View>
  ) : null;
  const where = places.length ? (
    <View style={{ marginTop: c.m.gap }} wrap={false}>
      <Text style={h}>{p.redeemAt}</Text>
      {places.map((l, i) => {
        const address = [l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        return (
          <Text key={i} style={small}>
            <Text style={{ fontWeight: 600 }}>{l.name}</Text>
            {address ? ` · ${address}` : ""}
          </Text>
        );
      })}
    </View>
  ) : null;
  // On half a page: short conditions stand beside the note and the places.
  if (c.ad && terms && terms.length <= AD_TERMS_BESIDE && (note || where))
    return (
      <View style={{ flexDirection: "row", gap: c.m.gap * 1.6 }} wrap={false}>
        <View style={{ flex: 2 }}>
          {note}
          {where}
        </View>
        <View style={{ flex: 3, marginTop: c.m.gap }}>
          <Text style={h}>{p.terms}</Text>
          <Text style={small}>{terms}</Text>
        </View>
      </View>
    );
  return (
    <>
      {note}
      {where}
      {terms ? (
        <View style={{ marginTop: c.m.gap }}>
          <Text style={h} minPresenceAhead={c.m.small * 3}>{p.terms}</Text>
          <Text style={small}>{terms}</Text>
        </View>
      ) : null}
    </>
  );
}

function Footer({ c }: { c: Ctx }) {
  return (
    <View
      style={{ position: "absolute", left: c.m.pad, right: c.m.pad, bottom: c.ad ? AD_HEIGHT[c.design.size] + c.m.gap * 0.7 : c.m.bottom * 0.4, flexDirection: "row", justifyContent: "space-between", fontSize: c.m.footer, color: MUTED, borderTopWidth: 0.5, borderTopColor: "#d4d4d8", paddingTop: c.m.gap * 0.4 }}
      fixed
    >
      <Text>{c.input.shopName}</Text>
      <Text>{c.input.host}</Text>
    </View>
  );
}

const pageStyle = (c: Ctx, overrides: Record<string, number> = {}) => ({
  fontFamily: "Inter",
  fontSize: c.m.body,
  color: "#111111",
  paddingTop: c.m.top,
  paddingHorizontal: c.m.pad,
  paddingBottom: c.m.bottom,
  ...overrides,
});

const size = (c: Ctx) => (c.design.size === "a6" ? "A6" : "A4");

// ------------------------------------------------------------------ layouts

/** Colour bar, logo, image, title, bordered code card. */
function Classic({ c, p }: { c: Ctx; p: Prepared }) {
  const { v } = p;
  return (
    <Page size={size(c)} style={pageStyle(c)}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: c.m.gap * 0.33, backgroundColor: c.accent }} fixed />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: c.m.gap }}>
        <Logo c={c} />
        {c.input.orderNumber ? <Text style={{ color: MUTED }}>{fmt(c.t.mail.pdf.order, { number: c.input.orderNumber })}</Text> : null}
      </View>
      {!c.ad && c.design.showImage && p.cover ? (
        <View style={{ marginBottom: c.m.gap }}>
          <Cover c={c} p={p} />
        </View>
      ) : null}
      <HeadingRow c={c} p={p} />
      <Gift c={c} />
      <View style={{ marginTop: c.m.gap, borderRadius: c.m.radius * 1.15, borderWidth: 1.5, borderColor: c.accent, paddingHorizontal: c.m.gap, paddingVertical: c.m.gap * (c.ad ? 0.5 : 1), flexDirection: "row", gap: c.m.gap, alignItems: "center" }} wrap={false}>
        <View style={{ flex: 1 }}>
          <CodeFacts c={c} v={v} />
        </View>
        <Symbol c={c} p={p} />
      </View>
      <Details c={c} v={v} />
      <Footer c={c} />
      <Ad c={c} />
    </Page>
  );
}

/** Coloured head like an event ticket, perforation, code centred. */
function Ticket({ c, p }: { c: Ctx; p: Prepared }) {
  const { v } = p;
  const on = readableOn(c.accent);
  const onMuted = mix(on, c.accent, 0.3);
  const notch = c.m.gap * 0.9;
  return (
    <Page size={size(c)} style={pageStyle(c, { paddingHorizontal: 0 })}>
      {/* The head reaches the paper edge; further pages keep the top margin. */}
      <View style={{ marginTop: -c.m.top, backgroundColor: c.accent, paddingHorizontal: c.m.pad, paddingTop: c.m.top, paddingBottom: c.m.gap * 1.3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: c.m.gap }}>
          {c.logo ? (
            <View style={{ backgroundColor: "#ffffff", borderRadius: c.m.radius * 0.6, paddingVertical: c.m.gap * 0.3, paddingHorizontal: c.m.gap * 0.5 }}>
              <Logo c={c} />
            </View>
          ) : (
            <Logo c={c} color={on} />
          )}
          {c.input.orderNumber ? <Text style={{ color: onMuted }}>{fmt(c.t.mail.pdf.order, { number: c.input.orderNumber })}</Text> : null}
        </View>
        <HeadingRow c={c} p={p} color={on} muted={onMuted} />
      </View>
      {!c.ad && c.design.showImage && p.cover ? <Image src={{ data: p.cover.data, format: "jpg" }} style={{ width: "100%", height: c.m.cover * 0.7, objectFit: "cover" }} /> : null}
      <View style={{ position: "relative", height: notch, justifyContent: "center", marginVertical: c.m.gap * 0.3 }}>
        <View style={{ marginHorizontal: c.m.pad * 0.7, borderTopWidth: 1.2, borderTopColor: "#c4c4c8", borderStyle: "dashed" }} />
        <View style={{ position: "absolute", left: -notch / 2, top: 0, width: notch, height: notch, borderRadius: notch / 2, backgroundColor: "#ececee" }} />
        <View style={{ position: "absolute", right: -notch / 2, top: 0, width: notch, height: notch, borderRadius: notch / 2, backgroundColor: "#ececee" }} />
      </View>
      {c.ad ? (
        <View style={{ paddingHorizontal: c.m.pad, flexDirection: "row", gap: c.m.gap, alignItems: "center" }} wrap={false}>
          <View style={{ flex: 1 }}>
            <CodeFacts c={c} v={v} />
          </View>
          <Symbol c={c} p={p} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: c.m.pad, alignItems: "center" }} wrap={false}>
          <Symbol c={c} p={p} />
          <View style={{ marginTop: c.m.gap * 0.5, width: "100%" }}>
            <CodeFacts c={c} v={v} align="center" />
          </View>
        </View>
      )}
      <View style={{ paddingHorizontal: c.m.pad }}>
        <Gift c={c} />
        <Details c={c} v={v} />
      </View>
      <Footer c={c} />
      <Ad c={c} />
    </Page>
  );
}

/** Much white space, thin lines, colour only as a small accent. */
function Minimal({ c, p }: { c: Ctx; p: Prepared }) {
  const { v } = p;
  const line = { borderTopWidth: 0.6, borderTopColor: "#d4d4d8" };
  return (
    <Page size={size(c)} style={pageStyle(c, { paddingTop: c.ad ? c.m.top : c.m.top * 1.3 })}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: c.ad ? c.m.gap * 0.8 : c.m.gap * 1.4 }}>
        <Logo c={c} />
        <Text style={{ color: MUTED, fontSize: c.m.small }}>{c.input.orderNumber ? fmt(c.t.mail.pdf.order, { number: c.input.orderNumber }) : c.input.host}</Text>
      </View>
      <View style={{ width: c.m.gap * 1.6, height: 2.5, backgroundColor: c.accent, marginBottom: c.m.gap * 0.7 }} />
      <HeadingRow c={c} p={p} />
      {!c.ad && c.design.showImage && p.cover ? (
        <View style={{ marginTop: c.m.gap }}>
          <Cover c={c} p={p} height={c.m.cover * 0.8} />
        </View>
      ) : null}
      <Gift c={c} />
      <View style={[line, { marginTop: c.m.gap * (c.ad ? 0.7 : 1.2), paddingVertical: c.m.gap * (c.ad ? 0.5 : 1), borderBottomWidth: 0.6, borderBottomColor: "#d4d4d8", flexDirection: "row", gap: c.m.gap, alignItems: "center" }]} wrap={false}>
        <View style={{ flex: 1 }}>
          <CodeFacts c={c} v={v} />
        </View>
        <Symbol c={c} p={p} />
      </View>
      <Details c={c} v={v} />
      <Footer c={c} />
      <Ad c={c} />
    </Page>
  );
}

const LAYOUTS = { classic: Classic, ticket: Ticket, minimal: Minimal } as const;

export async function renderVoucherPdf(input: PdfInput): Promise<Buffer> {
  await registerFonts();
  const design = input.design ?? DEFAULT_DESIGN;
  // Every visual once, however many vouchers show it; one that cannot be loaded leaves a full page.
  const general = activeAd(design);
  const adUrl = (v: PdfVoucher) => (v.ad === undefined ? general : v.ad);
  const adWidth = design.size === "a6" ? 1240 : 1860;
  const ads = new Map<string, Loaded | null>();
  await Promise.all([...new Set(input.vouchers.map(adUrl))].map(async (url) => url && ads.set(url, await loadImage(url, adWidth, "jpeg"))));
  const [logo, ...prepared] = await Promise.all([
    loadImage(input.logoUrl, 600, "png"),
    ...input.vouchers.map(async (v) => ({ v, cover: design.showImage ? await loadImage(v.image, design.size === "a6" ? 800 : 1400, "jpeg") : null, symbol: symbolOf(v) })),
  ]);
  const accentRaw = design.accent ?? input.primary;
  const base: Omit<Ctx, "ad" | "m"> = {
    input,
    design,
    accent: /^#[0-9a-f]{6}$/i.test(accentRaw) ? accentRaw : "#ff4b23",
    logo: logo as Loaded | null,
    t: getDictionary(input.locale),
    money: (c, cur) => formatMoney(c, cur, input.locale),
  };
  const Layout = LAYOUTS[design.layout];
  const doc = (
    <Document title={input.vouchers[0]?.title ?? input.shopName} author={input.shopName} creator="Sellycat" producer="Sellycat" language={input.locale}>
      {(prepared as Prepared[]).map((p, n) => {
        const ad = ads.get(adUrl(p.v) ?? "") ?? null;
        return <Layout key={n} c={{ ...base, ad, m: METRICS[ad ? (`${design.size}ad` as const) : design.size] }} p={p} />;
      })}
    </Document>
  );
  return renderToBuffer(doc);
}
