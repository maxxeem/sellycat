import "server-only";
import { headers } from "next/headers";
import { currencyForCountry, type Currency } from "./currency";

/** The visitor's country as Vercel sees it (ISO alpha-2), null locally. */
export async function countryFromRequest(): Promise<string | null> {
  const c = (await headers()).get("x-vercel-ip-country")?.trim().toUpperCase();
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
}

/** The currency to show a visitor before anything else is known about them. */
export async function currencyFromRequest(): Promise<Currency> {
  return currencyForCountry(await countryFromRequest());
}
