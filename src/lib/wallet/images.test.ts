import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { appleStrip, googleRoundLogo, googleWideLogo } from "./images";

const colors = { background: "#e42313", foreground: "#ffffff" };
const pixel = async (png: Buffer, x: number, y: number) => [...(await sharp(png).removeAlpha().extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer())];
const blue = (channels: 3 | 4) => ({ create: { width: 800, height: 600, channels, background: { r: 0, g: 0, b: 200, alpha: 1 } } });

describe("wallet images", () => {
  it("puts the image below the title in three sizes", async () => {
    const f = await appleStrip(await sharp(blue(3)).png().toBuffer(), "El Tony Mate", colors);
    expect(await sharp(f["strip.png"]).metadata()).toMatchObject({ width: 375, height: 144 });
    expect(await sharp(f["strip@3x.png"]).metadata()).toMatchObject({ width: 1125, height: 432 });
    expect(await pixel(f["strip@3x.png"], 1100, 20)).toEqual([228, 35, 19]);
    expect(await pixel(f["strip@3x.png"], 560, 125)).toEqual([0, 0, 200]);
    if (process.env.STRIP_OUT) await sharp(f["strip@3x.png"]).toFile(`${process.env.STRIP_OUT}/opaque.png`);
  }, 20_000);
  it("shows a cut-out product whole on the pass colour", async () => {
    const product = await sharp({ create: { width: 900, height: 900, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp({ create: { width: 200, height: 700, channels: 4, background: "#0000c8" } }).png().toBuffer() }]).png().toBuffer();
    const f = await appleStrip(product, "Ein etwas längerer Titel für ein feines Nachtessen zu zweit", colors);
    expect(await pixel(f["strip@3x.png"], 60, 300)).toEqual([228, 35, 19]);
    expect(await pixel(f["strip@3x.png"], 562, 300)).toEqual([0, 0, 200]);
    if (process.env.STRIP_OUT) await sharp(f["strip@3x.png"]).toFile(`${process.env.STRIP_OUT}/cutout.png`);
  }, 20_000);
  it("sizes Google's logos", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60"><rect x="10" y="10" width="280" height="40" fill="#123456"/></svg>');
    expect(await sharp(await googleWideLogo(svg)).metadata()).toMatchObject({ width: 1280, height: 400, hasAlpha: true });
    expect(await sharp(await googleRoundLogo(svg)).metadata()).toMatchObject({ width: 660, height: 660 });
    expect(await pixel(await googleRoundLogo(svg), 2, 2)).toEqual([255, 255, 255]);
    expect(await pixel(await googleRoundLogo(await sharp(blue(3)).png().toBuffer()), 2, 2)).toEqual([0, 0, 200]);
  });
});
