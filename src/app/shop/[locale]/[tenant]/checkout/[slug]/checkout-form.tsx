"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMemo, useState, useTransition } from "react";
import type { ShopTexts } from "@/components/shop/shop-texts";
import { fmt } from "@/lib/i18n";
import { formatMoney } from "@/lib/shop/deal-status";
import { startCheckout, type StartResult } from "./actions";

type Props = { tenantId: string; slug: string; unitCents: number; currency: string; locale: "de" | "en"; maxQty: number; shopName: string; t: ShopTexts };

/** loadStripe once per connected account (direct charges run on the shop's own Stripe account). */
const stripes = new Map<string, Promise<Stripe | null>>();
function stripeFor(publishableKey: string, account: string) {
  const key = `${publishableKey}:${account}`;
  if (!stripes.has(key)) stripes.set(key, loadStripe(publishableKey, { stripeAccount: account }));
  return stripes.get(key)!;
}

/**
 * Step 1: quantity, email, consent. Step 2: Stripe's embedded checkout inside the shop, while the
 * quantity stays reserved for 30 minutes.
 */
export function CheckoutForm({ tenantId, slug, unitCents, currency, locale, maxQty, shopName, t }: Props) {
  const [qty, setQty] = useState(1);
  const [session, setSession] = useState<Extract<StartResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const money = (c: number) => formatMoney(c, currency, locale);

  function submit(form: FormData) {
    setError(null);
    start(async () => {
      const res = await startCheckout(tenantId, slug, {
        qty,
        email: String(form.get("email") ?? ""),
        name: String(form.get("name") ?? ""),
        newsletter: form.get("newsletter") === "on",
        terms: form.get("terms") === "on",
      });
      if (res.ok) setSession(res);
      else setError(t.checkoutErrors[res.error]);
    });
  }

  const options = useMemo(() => (session ? { clientSecret: session.clientSecret } : null), [session]);

  if (session && options) {
    const until = new Date(session.expiresAt).toLocaleTimeString(locale === "de" ? "de-CH" : "en-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
    return (
      <div className="flex flex-col gap-4">
        <div className="shop-card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span>
            {fmt(t.orderNumber, { number: session.orderNumber })} · {fmt(t.reservedUntil, { time: until })}
          </span>
          <button type="button" className="underline text-[var(--shop-muted)]" onClick={() => setSession(null)}>
            {t.changeOrder}
          </button>
        </div>
        <div className="overflow-hidden rounded-[var(--shop-radius)] bg-[var(--shop-surface)]" data-testid="stripe-checkout">
          <EmbeddedCheckoutProvider stripe={stripeFor(session.publishableKey, session.account)} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  const field = "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-2.5 text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";
  return (
    <form action={submit} className="shop-card flex flex-col gap-4 p-6">
      <h1 className="shop-heading text-2xl font-bold">{t.checkoutTitle}</h1>
      <label className="flex items-center justify-between gap-4">
        <span className="font-semibold">{t.quantity}</span>
        <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className={`${field} w-24`} name="qty">
          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{t.email}</span>
        <input type="email" name="email" required autoComplete="email" className={field} />
        <span className="text-xs text-[var(--shop-muted)]">{t.emailHint}</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{t.name}</span>
        <input type="text" name="name" autoComplete="name" maxLength={120} className={field} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="newsletter" className="mt-1 h-4 w-4 accent-[var(--shop-primary)]" />
        <span>{fmt(t.newsletter, { shop: shopName })}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[var(--shop-primary)]" />
        <span>
          {t.acceptTerms}{" "}
          <a href="/agb" target="_blank" className="underline">
            {t.terms}
          </a>{" "}
          ·{" "}
          <a href="/datenschutz" target="_blank" className="underline">
            {t.privacy}
          </a>
        </span>
      </label>
      <div className="flex items-baseline justify-between border-t border-[var(--shop-line)] pt-4">
        <span className="font-semibold">{t.total}</span>
        <span className="text-2xl font-bold">{money(unitCents * qty)}</span>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-[var(--shop-warning)]">
          {error}
        </p>
      ) : null}
      <button type="submit" className="shop-btn w-full" disabled={pending} data-testid="to-payment">
        {pending ? "…" : t.toPayment}
      </button>
    </form>
  );
}
