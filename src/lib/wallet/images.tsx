import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { APPLE_STRIP, stripTitle } from "./content";

/**
 * Pictures of the wallet passes. Apple draws the main text over the strip image and has no place
 * for a title above it, so the title becomes part of the strip: text on top, deal image below.
 */
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
let font: Promise<Buffer> | null = null;
const inter = () => (font ??= readFile(path.join(process.cwd(), "src/app/fonts/Inter-SemiBold.ttf")));

const picture = (input: Buffer) => sharp(input, { density: 300, limitInputPixels: 50_000_000 }).rotate();

/** Title and deal image as strip.png in 1x, 2x and 3x. Cut-out products are shown whole. */
export async function appleStrip(image: Buffer, title: string, colors: { background: string; foreground: string }): Promise<Record<string, Buffer>> {
  const t = stripTitle(title);
  const s = 3;
  const width = APPLE_STRIP.width * s;
  const top = t.height * s;
  const left = APPLE_STRIP.height * s - top;
  const text = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", padding: `0 ${APPLE_STRIP.inset * s}px`, background: colors.background, color: colors.foreground, fontFamily: "Inter" }}>
        <div style={{ display: "block", width: "100%", lineClamp: t.lines, fontSize: t.size * s, lineHeight: 1.2 }}>{t.text}</div>
      </div>
    ),
    { width, height: top, fonts: [{ name: "Inter", data: await inter(), weight: 600, style: "normal" }] },
  );
  const cutOut = !(await picture(image).stats()).isOpaque;
  const photo = cutOut
    ? await picture(image).trim().resize({ width: width - 2 * APPLE_STRIP.inset * s, height: left, fit: "contain", background: CLEAR }).png().toBuffer()
    : await picture(image).resize({ width, height: left, fit: "cover", position: "centre" }).png().toBuffer();
  const full = await sharp({ create: { width, height: APPLE_STRIP.height * s, channels: 3, background: colors.background } })
    .composite([
      { input: Buffer.from(await text.arrayBuffer()), top: 0, left: 0 },
      { input: photo, top, left: cutOut ? APPLE_STRIP.inset * s : 0 },
    ])
    .png()
    .toBuffer();
  const at = (n: number) => sharp(full).resize({ width: APPLE_STRIP.width * n, height: APPLE_STRIP.height * n, fit: "fill" }).png().toBuffer();
  return { "strip.png": await at(1), "strip@2x.png": await at(2), "strip@3x.png": full };
}

/** Google's wide logo (16:5, not masked): the whole logo, left, on transparency. */
export const googleWideLogo = async (logo: Buffer): Promise<Buffer> =>
  picture(await picture(logo).trim().png().toBuffer()).resize({ width: 1280, height: 400, fit: "contain", position: "left", background: CLEAR }).ensureAlpha().png({ palette: false }).toBuffer();

/** Google masks the small logo to a circle: the icon with a margin on a full square. */
export const googleRoundLogo = async (icon: Buffer): Promise<Buffer> => {
  // An icon with its own background continues it to the edge, a transparent one stands on white.
  const opaque = (await picture(icon).stats()).isOpaque;
  const [r, g, b] = opaque ? await picture(icon).removeAlpha().toColorspace("srgb").extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer() : [255, 255, 255];
  const inner = await picture(icon).resize({ width: 460, height: 460, fit: "contain", background: CLEAR }).png().toBuffer();
  return sharp({ create: { width: 660, height: 660, channels: 3, background: { r, g, b } } }).composite([{ input: inner, gravity: "centre" }]).png({ palette: false }).toBuffer();
};
