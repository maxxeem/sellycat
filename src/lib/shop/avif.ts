/**
 * AVIF uploads (browser): converted to JPEG before they are stored, because share images, wallet
 * passes and some mail programs cannot show AVIF. Orientation is applied, large photos shrink to
 * `AVIF_MAX` pixels, transparency becomes white.
 */
export const AVIF_MAX = 2560;

/** Some systems report no type for .avif files. */
export const isAvif = (f: { name: string; type: string }) => f.type === "image/avif" || (!f.type && /\.avif$/i.test(f.name));

/** Size within `max` on the longer side, never enlarged. */
export function fitSize(width: number, height: number, max = AVIF_MAX): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Throws when this browser cannot read the file. */
export async function avifToJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file.type ? file : new Blob([file], { type: "image/avif" }));
  try {
    const { width, height } = fitSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("no jpeg");
    return new File([blob], `${file.name.replace(/\.[a-z0-9]+$/i, "")}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
