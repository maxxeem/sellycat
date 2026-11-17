import "server-only";
import { createSign } from "node:crypto";
import { googleConfig } from "./config";
import { googleClassId, googleObject, googleState, type WalletDesign, type WalletShop, type WalletVoucher } from "./content";

/**
 * Google Wallet: one generic class per shop, one object per voucher. The "save" link carries
 * the object in a JWT signed with the service account key; later state changes go through the
 * REST API.
 */
const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

function signJwt(payload: Record<string, unknown>): string | null {
  const cfg = googleConfig();
  if (!cfg) return null;
  const unsigned = `${b64({ alg: "RS256", typ: "JWT", ...(cfg.keyId ? { kid: cfg.keyId } : {}) })}.${b64(payload)}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(cfg.privateKey).toString("base64url");
  return `${unsigned}.${sig}`;
}

let token: { value: string; until: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const cfg = googleConfig();
  if (!cfg) return null;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({ iss: cfg.serviceAccount, scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  if (!assertion) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }), signal: AbortSignal.timeout(10_000) });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    token = { value: json.access_token, until: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return token.value;
  } catch {
    return null;
  }
}

async function api(path: string, init: RequestInit = {}): Promise<Response | null> {
  const t = await accessToken();
  if (!t) return null;
  return fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
}

const classesReady = new Set<string>();

/** The shop's class must exist before an object can be saved. */
async function ensureClass(shopId: string): Promise<boolean> {
  const cfg = googleConfig();
  if (!cfg) return false;
  const id = googleClassId(cfg.issuerId, shopId);
  if (classesReady.has(id)) return true;
  const got = await api(`/genericClass/${encodeURIComponent(id)}`);
  if (got?.ok) {
    classesReady.add(id);
    return true;
  }
  const res = await api("/genericClass", { method: "POST", body: JSON.stringify({ id }) });
  if (res && (res.ok || res.status === 409)) {
    classesReady.add(id);
    return true;
  }
  console.warn("[google wallet] class", id, res?.status, res ? (await res.text()).slice(0, 300) : "no response");
  return false;
}

/** "Add to Google Wallet" link (the object is created when the person saves it). */
export async function googleSaveUrl(v: WalletVoucher, shop: WalletShop, design: WalletDesign, origins: string[]): Promise<{ url: string; objectId: string } | null> {
  const cfg = googleConfig();
  if (!cfg || !(await ensureClass(shop.id))) return null;
  const object = googleObject(v, shop, design, cfg.issuerId);
  const jwt = signJwt({ iss: cfg.serviceAccount, aud: "google", typ: "savetowallet", origins, payload: { genericObjects: [object] } });
  return jwt ? { url: `https://pay.google.com/gp/v/save/${jwt}`, objectId: object.id } : null;
}

/** Brings a saved object up to date (state, value, design). A never-saved object is skipped. */
export async function updateGoogleObject(v: WalletVoucher, shop: WalletShop, design: WalletDesign): Promise<"updated" | "missing" | "failed"> {
  const cfg = googleConfig();
  if (!cfg) return "failed";
  const object = googleObject(v, shop, design, cfg.issuerId);
  const res = await api(`/genericObject/${encodeURIComponent(object.id)}`, { method: "PUT", body: JSON.stringify(object) });
  if (!res) return "failed";
  if (res.status === 404) return "missing";
  return res.ok ? "updated" : "failed";
}

export { googleState };
