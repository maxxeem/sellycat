/**
 * Currency by country (pure, tested), as in SwypeCast. Prices are numerically the same in every
 * currency (49 CHF = 49 EUR = 49 USD): Switzerland and Liechtenstein pay CHF, the rest of Europe
 * EUR, everyone else USD. A Stripe customer keeps the currency of its first subscription.
 */
export const CURRENCIES = ["CHF", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

const CHF_COUNTRIES = new Set(["CH", "LI"]);
/** Europe without Switzerland and Liechtenstein: EU, EEA, UK, the Balkans, the east, the micro states. */
const EURO_COUNTRIES = new Set("AD AL AT AX BA BE BG BY CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SJ SK SM UA VA XK".split(" "));

export function currencyForCountry(country: string | null | undefined): Currency {
  const c = (country ?? "").trim().toUpperCase();
  if (!c || CHF_COUNTRIES.has(c)) return "CHF";
  if (EURO_COUNTRIES.has(c)) return "EUR";
  return "USD";
}

export const isCurrency = (v: unknown): v is Currency => typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);

/** Stripe's lower-case code → ours, null for anything we do not sell in. */
export function currencyFromStripe(code: string | null | undefined): Currency | null {
  const upper = (code ?? "").toUpperCase();
  return isCurrency(upper) ? upper : null;
}
