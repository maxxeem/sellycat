import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { appleConfig, passkitServiceUrl } from "./config";
import { appleStrip } from "./images";
import { applePassJson, walletColors, type WalletDesign, type WalletShop, type WalletVoucher } from "./content";

/**
 * Signed Apple Wallet pass (.pkpass): pass.json, icon, logo and the deal image as strip, signed
 * with the platform's Pass Type ID certificate. Images only from our own storage.
 */
function ownStorage(url: string | null): url is string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && base && url.startsWith(`${base.replace(/\/$/, "")}/storage/v1/object/public/`));
}

async function fetchImage(url: string | null): Promise<Buffer | null> {
  if (!ownStorage(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 15_000_000 ? null : buf;
  } catch {
    return null;
  }
}

const SCALES = [1, 2, 3] as const;
const name = (base: string, s: number) => (s === 1 ? `${base}.png` : `${base}@${s}x.png`);

async function variants(input: Buffer, base: string, w: number, h: number, fit: "contain" | "cover", background?: string): Promise<Record<string, Buffer>> {
  const out: Record<string, Buffer> = {};
  for (const s of SCALES) {
    let img = sharp(input, { density: 300, limitInputPixels: 50_000_000 }).rotate().resize({ width: w * s, height: h * s, fit, position: "centre", background: background ?? { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: fit === "contain" });
    if (background) img = img.flatten({ background });
    out[name(base, s)] = await img.png().toBuffer();
  }
  return out;
}

let fallbackIcon: Promise<Buffer> | null = null;
const sellycatIcon = () => (fallbackIcon ??= readFile(path.join(process.cwd(), "public/android-chrome-512.png")));

export async function buildApplePass(v: WalletVoucher, shop: WalletShop & { iconUrl: string | null }, design: WalletDesign, authToken: string | null): Promise<Buffer | null> {
  const cfg = appleConfig();
  if (!cfg) return null;
  const service = passkitServiceUrl();
  const colors = walletColors(design, shop.primary);
  const [logoSrc, iconSrc, stripSrc] = await Promise.all([fetchImage(shop.logo), fetchImage(shop.iconUrl), design.showImage ? fetchImage(v.image) : Promise.resolve(null)]);
  // A picture that cannot be processed leaves the pass without it, never without its title.
  const strip = stripSrc
    ? await appleStrip(stripSrc, v.title, colors).catch((e) => {
        console.warn("[apple wallet] strip", e instanceof Error ? e.message : e);
        return null;
      })
    : null;
  const json = applePassJson(v, shop, design, {
    passTypeIdentifier: cfg.passTypeIdentifier,
    teamIdentifier: cfg.teamIdentifier,
    ...(authToken && service ? { authenticationToken: authToken, webServiceURL: service } : {}),
  }, strip !== null);
  const files: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(json)) };
  Object.assign(files, await variants(iconSrc ?? logoSrc ?? (await sellycatIcon()), "icon", 29, 29, "contain", "#ffffff"));
  if (logoSrc) Object.assign(files, await variants(logoSrc, "logo", 160, 50, "contain"));
  if (strip) Object.assign(files, strip);
  const pass = new PKPass(files, { wwdr: cfg.wwdr, signerCert: cfg.signerCert, signerKey: cfg.signerKey });
  return pass.getAsBuffer();
}
