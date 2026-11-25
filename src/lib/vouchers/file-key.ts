import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { hasAccess } from "./access";

/**
 * The PDF and wallet files of a voucher contain its code. The QR code (token) alone must not open
 * them: links in our own mails and on the buyer's pages carry this key, anyone else goes through
 * the voucher page and its email code.
 */
export function fileKey(token: string): string {
  return createHmac("sha256", serverEnv.supabaseSecretKey).update(`voucher-file:${token}`).digest("base64url").slice(0, 32);
}

export function fileKeyValid(token: string, given: string | null): boolean {
  if (!given) return false;
  const a = Buffer.from(fileKey(token));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Key in the link, an unlocked device, or the shop's own team; otherwise the voucher page. */
export async function fileAccess(tenantId: string, token: string, request: Request): Promise<Response | null> {
  if (fileKeyValid(token, new URL(request.url).searchParams.get("k"))) return null;
  if (await hasAccess(tenantId, token)) return null;
  const supabase = await createClient();
  if ((await supabase.auth.getClaims()).data?.claims?.sub) {
    const { data } = await supabase.rpc("find_voucher_by_token", { p_tenant: tenantId, p_token: token });
    if (data) return null;
  }
  return new Response(null, { status: 303, headers: { Location: `/v/${token}`, "Cache-Control": "private, no-store" } });
}
