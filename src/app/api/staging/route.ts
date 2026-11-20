import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { STAGING_COOKIE, stagingToken } from "@/lib/site/staging-gate";
import { siteHost } from "@/lib/site/hosts";

const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });
const digest = (v: string) => createHash("sha256").update(v).digest();
const samePassword = (given: unknown, expected: string) => typeof given === "string" && timingSafeEqual(digest(given), digest(expected));

/** Checks the staging password and sets the gate cookie for the whole staging domain (30 days). */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = process.env.STAGING_PASSWORD;
  const next = String(form.get("next") ?? "/");
  const root = siteHost().split(":")[0];
  const requestHost = (request.headers.get("x-forwarded-host") ?? new URL(request.url).hostname).split(":")[0].toLowerCase();
  const back = new URL("/staging", request.url);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!password || !limiter.check(ip).ok || !samePassword(form.get("password"), password)) {
    back.searchParams.set("error", "1");
    back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }
  // Only go back to our own hosts.
  let target = new URL("/", request.url);
  try {
    const u = new URL(next, request.url);
    if (u.hostname === root || u.hostname.endsWith(`.${root}`) || u.hostname === new URL(request.url).hostname) target = u;
  } catch {}
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(STAGING_COOKIE, await stagingToken(password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    domain: root && root !== "localhost" && (requestHost === root || requestHost.endsWith(`.${root}`)) ? `.${root}` : undefined,
  });
  return res;
}
