import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Wallet credentials. On Vercel they come from environment variables (PEM text or base64 of
 * it); locally from the git-ignored folder WALLET_KEYS_DIR (sellycat-keys). Without them the
 * wallet buttons stay hidden.
 */
function pem(envName: string, file: string): string | null {
  const raw = process.env[envName]?.trim();
  if (raw) return raw.startsWith("-----BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
  // Local development only: deployments get the keys from environment variables, and the folder
  // must never be traced into a server bundle.
  const dir = process.env.WALLET_KEYS_DIR;
  if (!dir || process.env.NODE_ENV === "production") return null;
  try {
    return readFileSync(/* turbopackIgnore: true */ path.resolve(process.cwd(), dir, file), "utf8");
  } catch {
    return null;
  }
}

export type AppleConfig = { passTypeIdentifier: string; teamIdentifier: string; signerCert: string; signerKey: string; wwdr: string };
export type GoogleConfig = { issuerId: string; serviceAccount: string; keyId: string | null; privateKey: string };

let apple: AppleConfig | null | undefined;
let google: GoogleConfig | null | undefined;

export function appleConfig(): AppleConfig | null {
  if (apple !== undefined) return apple;
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID;
  const teamIdentifier = process.env.APPLE_TEAM_ID;
  const signerCert = pem("APPLE_PASS_CERT", "apple-pass-cert.pem");
  const signerKey = pem("APPLE_PASS_KEY", "apple-pass.key");
  const wwdr = pem("APPLE_WWDR_CERT", "apple-wwdr-g4.pem");
  apple = passTypeIdentifier && teamIdentifier && signerCert && signerKey && wwdr ? { passTypeIdentifier, teamIdentifier, signerCert, signerKey, wwdr } : null;
  return apple;
}

export function googleConfig(): GoogleConfig | null {
  if (google !== undefined) return google;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccount = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;
  const privateKey = pem("GOOGLE_WALLET_PRIVATE_KEY", "google-wallet.key");
  google = issuerId && serviceAccount && privateKey ? { issuerId, serviceAccount, keyId: process.env.GOOGLE_WALLET_KEY_ID ?? null, privateKey } : null;
  return google;
}

/** Apple's update service needs a fixed https URL on the platform host. */
export function passkitServiceUrl(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return /^https:\/\//.test(site) ? `${site.replace(/\/$/, "")}/api/passkit` : null;
}
