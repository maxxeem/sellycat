import { fileAccess } from "@/lib/vouchers/file-key";
import { applePassFile } from "@/lib/wallet/passes";

/** The voucher as Apple Wallet pass; opened with the key from our own links, an unlocked device or the shop's team. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; token: string }> }) {
  const { tenant, token } = await params;
  if (!/^[\w-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const denied = await fileAccess(tenant, token, request);
  if (denied) return denied;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const pass = await applePassFile(tenant, token, host);
  if (!pass) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(pass.file), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${pass.name}.pkpass"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
