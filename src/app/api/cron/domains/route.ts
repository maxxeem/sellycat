import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { checkDueDomains } from "@/lib/site/shop-domains";

export const maxDuration = 300;

/**
 * Daily (Vercel Cron with `CRON_SECRET`): shops' own domains that still wait for DNS, and the
 * live ones (a main domain that stopped working falls back to the Sellycat address).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await checkDueDomains();
  for (const id of result.tenants) revalidateTag(`shop:${id}`, "max");
  return NextResponse.json({ ok: true, checked: result.checked, changed: result.tenants.length });
}
