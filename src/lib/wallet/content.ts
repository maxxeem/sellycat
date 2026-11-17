/**
 * What a voucher pass shows, for Apple Wallet (pass.json fields) and Google Wallet (generic
 * object). Pure and tested; signing, images and API calls live next door.
 */
import { hexToRgb, mix, readableOn } from "@/lib/design/color";
import { fmt, getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/shop/deal-status";
import type { BarcodeType, CodeFormat } from "@/lib/vouchers/symbol";

export type WalletVoucher = {
  id: string;
  title: string;
  partner: string | null;
  code: string;
  codeFormat: CodeFormat;
  barcodeType: BarcodeType | null;
  /** Check link (/v/<token>) on the shop's main host. */
  link: string;
  status: "valid" | "redeemed" | "expired" | "refunded" | "void";
  valueCents: number | null;
  remainingCents: number | null;
  currency: string;
  validUntil: string | null;
  terms: string | null;
  image: string | null;
  locations: Array<{ name: string; street: string | null; zip: string | null; city: string | null; lat?: number | null; lng?: number | null }>;
};
export type WalletShop = { id: string; name: string; locale: "de" | "en"; host: string; primary: string; logo: string | null };
export type WalletDesign = { background: string | null; foreground: string | null; label: string | null; showImage: boolean; showLocations: boolean };

export const DEFAULT_WALLET_DESIGN: WalletDesign = { background: null, foreground: null, label: null, showImage: true, showLocations: true };
const HEX = /^#[0-9a-f]{6}$/i;

export function parseWalletDesign(i: Partial<Record<keyof WalletDesign, unknown>> | null | undefined): WalletDesign {
  const v = i ?? {};
  const hex = (x: unknown) => (typeof x === "string" && HEX.test(x) ? x.toLowerCase() : null);
  return {
    background: hex(v.background),
    foreground: hex(v.foreground),
    label: hex(v.label),
    showImage: typeof v.showImage === "boolean" ? v.showImage : true,
    showLocations: typeof v.showLocations === "boolean" ? v.showLocations : true,
  };
}

/** Colours actually used: the shop's main colour by default, text readable on it. */
export function walletColors(design: WalletDesign, shopPrimary: string) {
  const background = design.background ?? (HEX.test(shopPrimary) ? shopPrimary.toLowerCase() : "#ff4b23");
  const foreground = design.foreground ?? readableOn(background);
  const label = design.label ?? mix(foreground, background, 0.3);
  return { background, foreground, label };
}

const rgb = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
};

const dateText = (iso: string, locale: "de" | "en") =>
  new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

const address = (l: WalletVoucher["locations"][number]) => [l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/** Platform-neutral rows (also used by the editor preview). */
export function passRows(v: WalletVoucher, shop: WalletShop) {
  const t = getDictionary(shop.locale);
  const w = t.wallet;
  const money = (c: number) => formatMoney(c, v.currency, shop.locale);
  const value =
    v.valueCents !== null ? (v.remainingCents !== null && v.remainingCents !== v.valueCents ? money(v.remainingCents) : money(v.valueCents)) : null;
  return {
    header: v.status === "valid" ? (value ? { label: v.remainingCents !== v.valueCents ? w.remaining : w.value, value } : null) : { label: w.status, value: t.shop.voucherStatus[v.status] },
    title: v.title,
    partner: v.partner,
    validity: v.validUntil ? { label: w.validUntil, value: dateText(v.validUntil, shop.locale) } : { label: w.validity, value: w.noExpiry },
    code: { label: w.code, value: v.code },
    terms: v.terms?.trim() ? { label: w.terms, value: v.terms.trim().slice(0, 4000) } : null,
    locations: v.locations.length ? { label: w.redeemAt, value: v.locations.slice(0, 10).map((l) => [l.name, address(l)].filter(Boolean).join(" · ")).join("\n") } : null,
    shopLink: { label: w.shop, value: `https://${shop.host}` },
    checkLink: { label: w.check, value: v.link },
    relevantText: fmt(w.nearby, { shop: shop.name }),
  };
}

// ---------------------------------------------------------------- Apple

type AppleBarcode = { format: "PKBarcodeFormatQR" | "PKBarcodeFormatCode128" | "PKBarcodeFormatPDF417" | "PKBarcodeFormatAztec"; message: string; messageEncoding: "iso-8859-1"; altText?: string };

/**
 * Apple only reads QR, PDF417, Aztec and Code 128. Every other barcode type gets the QR code of
 * the check link, with the code as text below it.
 */
export function appleBarcode(v: Pick<WalletVoucher, "codeFormat" | "barcodeType" | "code" | "link">): AppleBarcode {
  const code = v.code.replace(/\s/g, "");
  if (v.codeFormat === "barcode" && v.barcodeType === "code128" && /^[\x20-\x7e]+$/.test(code)) return { format: "PKBarcodeFormatCode128", message: code, messageEncoding: "iso-8859-1", altText: v.code };
  if (v.codeFormat === "barcode" && v.barcodeType === "pdf417") return { format: "PKBarcodeFormatPDF417", message: code, messageEncoding: "iso-8859-1", altText: v.code };
  return { format: "PKBarcodeFormatQR", message: v.link, messageEncoding: "iso-8859-1", altText: v.code };
}

type Field = { key: string; label?: string; value: string; textAlignment?: string; dataDetectorTypes?: string[] };

/** pass.json content of a coupon pass (without images and signature). */
export function applePassJson(
  v: WalletVoucher,
  shop: WalletShop,
  design: WalletDesign,
  ids: { passTypeIdentifier: string; teamIdentifier: string; authenticationToken?: string; webServiceURL?: string },
) {
  const rows = passRows(v, shop);
  const colors = walletColors(design, shop.primary);
  const barcode = appleBarcode(v);
  const back: Field[] = [
    { key: "code", label: rows.code.label, value: v.code },
    ...(rows.terms ? [{ key: "terms", label: rows.terms.label, value: rows.terms.value }] : []),
    ...(rows.locations ? [{ key: "places", label: rows.locations.label, value: rows.locations.value }] : []),
    { key: "check", label: rows.checkLink.label, value: rows.checkLink.value, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
    { key: "shop", label: rows.shopLink.label, value: rows.shopLink.value, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
  ];
  const locations = design.showLocations
    ? v.locations
        .filter((l) => typeof l.lat === "number" && typeof l.lng === "number")
        .slice(0, 10)
        .map((l) => ({ latitude: l.lat as number, longitude: l.lng as number, relevantText: rows.relevantText }))
    : [];
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    teamIdentifier: ids.teamIdentifier,
    serialNumber: v.id,
    organizationName: shop.name.slice(0, 60),
    description: v.title.slice(0, 120),
    ...(shop.logo ? {} : { logoText: shop.name.slice(0, 30) }),
    backgroundColor: rgb(colors.background),
    foregroundColor: rgb(colors.foreground),
    labelColor: rgb(colors.label),
    ...(ids.authenticationToken && ids.webServiceURL ? { authenticationToken: ids.authenticationToken, webServiceURL: ids.webServiceURL } : {}),
    ...(v.validUntil ? { expirationDate: new Date(v.validUntil).toISOString() } : {}),
    ...(v.status !== "valid" ? { voided: true } : {}),
    ...(locations.length ? { locations } : {}),
    barcodes: [barcode],
    barcode,
    coupon: {
      headerFields: rows.header ? [{ key: "header", label: rows.header.label, value: rows.header.value, textAlignment: "PKTextAlignmentRight" }] : [],
      primaryFields: [{ key: "offer", value: v.title }],
      secondaryFields: [
        ...(v.partner ? [{ key: "partner", label: getDictionary(shop.locale).wallet.partner, value: v.partner }] : []),
        { key: "validity", label: rows.validity.label, value: rows.validity.value, ...(v.partner ? { textAlignment: "PKTextAlignmentRight" } : {}) },
      ],
      auxiliaryFields: [],
      backFields: back,
    },
  };
}

// ---------------------------------------------------------------- Google

const GOOGLE_BARCODE: Record<BarcodeType, string> = {
  ean13: "EAN_13",
  ean8: "EAN_8",
  upca: "UPC_A",
  code128: "CODE_128",
  code39: "CODE_39",
  itf14: "ITF_14",
  datamatrix: "DATA_MATRIX",
  pdf417: "PDF_417",
};

export const googleState = (s: WalletVoucher["status"]) => (s === "valid" ? "ACTIVE" : s === "redeemed" ? "COMPLETED" : s === "expired" ? "EXPIRED" : "INACTIVE");

/** Ids may only contain letters, digits, ".", "_" and "-". */
export const googleClassId = (issuer: string, tenantId: string) => `${issuer}.shop_${tenantId.replace(/-/g, "")}`;
export const googleObjectId = (issuer: string, voucherId: string) => `${issuer}.v_${voucherId.replace(/-/g, "")}`;

/** Google fetches images itself: only public https PNG/JPEG/WebP, no SVG. */
const googleImage = (url: string | null) => (url && /^https:\/\//.test(url) && !/\.svg(\?|$)/i.test(url) ? { sourceUri: { uri: url } } : undefined);

export function googleObject(v: WalletVoucher, shop: WalletShop, design: WalletDesign, issuer: string) {
  const rows = passRows(v, shop);
  const colors = walletColors(design, shop.primary);
  const lang = shop.locale === "de" ? "de" : "en";
  const text = (value: string) => ({ defaultValue: { language: lang, value } });
  const barcode =
    v.codeFormat === "barcode" && v.barcodeType
      ? { type: GOOGLE_BARCODE[v.barcodeType], value: v.code.replace(/\s/g, ""), alternateText: v.code }
      : { type: "QR_CODE", value: v.link, alternateText: v.code };
  const modules = [
    rows.header ? { id: "header", header: rows.header.label, body: rows.header.value } : null,
    { id: "validity", header: rows.validity.label, body: rows.validity.value },
    { id: "code", header: rows.code.label, body: v.code },
    rows.locations ? { id: "places", header: rows.locations.label, body: rows.locations.value } : null,
    rows.terms ? { id: "terms", header: rows.terms.label, body: rows.terms.value } : null,
  ].filter(Boolean);
  const logo = googleImage(shop.logo);
  const hero = design.showImage ? googleImage(v.image) : undefined;
  return {
    id: googleObjectId(issuer, v.id),
    classId: googleClassId(issuer, shop.id),
    state: googleState(v.status),
    cardTitle: text(shop.name.slice(0, 60)),
    header: text(v.title.slice(0, 120)),
    ...(v.partner ? { subheader: text(v.partner.slice(0, 60)) } : {}),
    ...(logo ? { logo } : {}),
    ...(hero ? { heroImage: hero } : {}),
    hexBackgroundColor: colors.background,
    barcode,
    textModulesData: modules,
    linksModuleData: { uris: [{ id: "check", uri: v.link, description: rows.checkLink.label }, { id: "shop", uri: rows.shopLink.value, description: rows.shopLink.label }] },
    ...(v.validUntil ? { validTimeInterval: { end: { date: new Date(v.validUntil).toISOString() } } } : {}),
  };
}
