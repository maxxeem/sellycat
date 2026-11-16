import "server-only";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { cleanSecret, looksLikeStripeKey } from "./map";

/**
 * Sellycat's Stripe platform account. Payments themselves run on each customer's own connected
 * account (`{ stripeAccount }` on every call), Sellycat only receives the application fee.
 *
 * Environment: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_CONNECT_CLIENT_ID
 * (Connect → Settings → OAuth), STRIPE_CONNECT_WEBHOOK_SECRET (endpoint "events on connected accounts").
 */
const secretKey = () => cleanSecret(process.env.STRIPE_SECRET_KEY);

export const connectWebhookSecret = () => cleanSecret(process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
export const connectClientId = () => cleanSecret(process.env.STRIPE_CONNECT_CLIENT_ID);
export const publishableKey = () => cleanSecret(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/** Payments work only with all three: secret key, publishable key (checkout) and Connect client id. */
export function stripeConfigured(): boolean {
  return Boolean(secretKey() && publishableKey() && connectClientId());
}

export const stripeLivemode = () => Boolean(secretKey()?.startsWith("sk_live_"));

let client: Stripe | null = null;
export function getStripe(): Stripe {
  const key = secretKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!looksLikeStripeKey(key)) console.error(`[stripe] STRIPE_SECRET_KEY has an unexpected shape (length ${key.length}). Re-enter it in the hosting environment.`);
  client ??= new Stripe(key, { appInfo: { name: "Sellycat", url: "https://sellycat.com" }, maxNetworkRetries: 2 });
  return client;
}

/** Key for signing the Connect OAuth state; derived from the secret key, never sent anywhere. */
export function stateSecret(): string {
  return createHash("sha256").update(`sellycat-connect-state:${secretKey() ?? ""}`).digest("hex");
}
