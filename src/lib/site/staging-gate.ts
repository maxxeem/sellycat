/**
 * Password gate for the staging deployments (isomorphic, Web Crypto): when STAGING_PASSWORD is
 * set, every page needs the cookie `sc_staging` = HMAC(password). Production never sets the variable.
 */
export const STAGING_COOKIE = "sc_staging";
export const STAGING_GATE_PATH = "/staging";
const EXEMPT = [STAGING_GATE_PATH, "/api/staging", "/api/health", "/api/cron/", "/api/webhooks/", "/api/stripe/webhook", "/api/stripe/billing", "/api/passkit/", "/api/v1", "/api/v1/"];

export const stagingGateEnabled = () => Boolean(process.env.STAGING_PASSWORD);
export const stagingExempt = (pathname: string) => EXEMPT.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));

export async function stagingToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("sellycat-staging-gate"));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function stagingCookieValid(value: string | undefined): Promise<boolean> {
  const password = process.env.STAGING_PASSWORD;
  if (!password || !value) return false;
  return value === (await stagingToken(password));
}
