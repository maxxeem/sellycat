/**
 * Own font files for the shop theme: which formats we take, how they are stored and how the
 * browser is told the format. Isomorphic, unit-tested.
 */
export const FONT_FORMATS = {
  woff2: { mime: "font/woff2", css: "woff2" },
  woff: { mime: "font/woff", css: "woff" },
  ttf: { mime: "font/ttf", css: "truetype" },
  otf: { mime: "font/otf", css: "opentype" },
} as const;
export type FontExt = keyof typeof FONT_FORMATS;

export const FONT_MAX_BYTES = 5 * 1024 * 1024;
/** For `<input accept>`: extensions, because browsers often report no MIME type for fonts. */
export const FONT_ACCEPT = ".woff2,.woff,.ttf,.otf";

export const fontExt = (name: string): FontExt | null => {
  const ext = name.split(/[?#]/)[0]!.split(".").pop()?.toLowerCase() ?? "";
  return ext in FONT_FORMATS ? (ext as FontExt) : null;
};

/** The format from the file's first bytes (the extension can lie). */
export function sniffFont(head: Uint8Array): FontExt | null {
  const tag = String.fromCharCode(...head.slice(0, 4));
  if (tag === "wOF2") return "woff2";
  if (tag === "wOFF") return "woff";
  if (tag === "OTTO") return "otf";
  if (tag === "true" || (head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0)) return "ttf";
  return null;
}

export type FontCheck = { ok: true; ext: FontExt; mime: string } | { ok: false; error: "type" | "size" };

export function checkFontFile(name: string, size: number, head: Uint8Array): FontCheck {
  const sniffed = sniffFont(head);
  if (!fontExt(name) || !sniffed) return { ok: false, error: "type" };
  if (size > FONT_MAX_BYTES) return { ok: false, error: "size" };
  return { ok: true, ext: sniffed, mime: FONT_FORMATS[sniffed].mime };
}

/** A readable family name from the file name ("MyBrand-Bold.ttf" → "MyBrand Bold"). */
export const familyFromFile = (name: string) =>
  name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** CSS `format()` hint for a stored font URL (older uploads are woff2). */
export const fontCssFormat = (url: string) => FONT_FORMATS[fontExt(url) ?? "woff2"].css;
