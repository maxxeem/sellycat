import { NextResponse, type NextRequest } from "next/server";
import { isSafeFontFile } from "@/lib/design/font-proxy";

/** A font file from fonts.gstatic.com, served from our domain (see font-proxy.ts). Files are immutable. */
const TYPES: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!isSafeFontFile(path)) return new NextResponse("Bad font path", { status: 400 });
  const upstream = await fetch(`https://fonts.gstatic.com/${path}`).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) return new NextResponse("Font not found", { status: 404 });
  const ext = path.split(".").pop() ?? "";
  return new NextResponse(upstream.body, { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*" } });
}
