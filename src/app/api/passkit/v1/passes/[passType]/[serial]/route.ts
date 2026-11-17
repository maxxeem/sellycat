import { applePassBySerial } from "@/lib/wallet/passes";
import { authToken, validPassType } from "@/lib/wallet/webservice";

/** The latest version of a pass (the device proves itself with the pass's token). */
export async function GET(request: Request, { params }: { params: Promise<{ passType: string; serial: string }> }) {
  const { passType, serial } = await params;
  if (!validPassType(passType)) return new Response(null, { status: 404 });
  const token = authToken(request);
  if (!token) return new Response(null, { status: 401 });
  const pass = await applePassBySerial(serial, token);
  if (!pass) return new Response(null, { status: 401 });
  const modified = new Date(pass.updatedAt);
  const since = request.headers.get("if-modified-since");
  if (since && !Number.isNaN(Date.parse(since)) && Math.floor(modified.getTime() / 1000) <= Math.floor(Date.parse(since) / 1000)) return new Response(null, { status: 304 });
  return new Response(new Uint8Array(pass.file), { headers: { "Content-Type": "application/vnd.apple.pkpass", "Last-Modified": modified.toUTCString(), "Cache-Control": "no-store" } });
}
