import "server-only";
import { headers } from "next/headers";
import { classifyHost } from "@/lib/site/hosts";
import { resolveShop } from "@/lib/site/resolve-shop";

/** robots.txt, sitemap.xml and llms.txt bypass the proxy: the shop of the request's host, null on the apex. */
export async function requestShop(): Promise<{ apex: boolean; tenantId: string | null }> {
  const h = await headers();
  const kind = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  if (kind.kind === "apex") return { apex: true, tenantId: null };
  return { apex: false, tenantId: (await resolveShop(kind))?.id ?? null };
}
