import "server-only";
import { fromGooglePeriods, type OpeningHours } from "@/lib/shop/hours";

/**
 * Google Places API (New): search a business while typing, then take its address, position and
 * opening hours. The key stays on the server (GOOGLE_PLACES_API_KEY); one session token per
 * search keeps it one billable session.
 */
const API = "https://places.googleapis.com/v1";
const REGIONS = ["ch", "li", "de", "at", "fr", "it"];

export const placesConfigured = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);

export type PlaceSuggestion = { id: string; main: string; secondary: string };
export type PlaceDetails = {
  placeId: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  hours: OpeningHours | null;
};

const headers = (fieldMask?: string) => ({
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "",
  ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
});

export async function searchPlaces(input: string, sessionToken: string, language: "de" | "en"): Promise<PlaceSuggestion[]> {
  if (!placesConfigured() || input.trim().length < 3) return [];
  try {
    const res = await fetch(`${API}/places:autocomplete`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ input: input.trim().slice(0, 120), sessionToken, languageCode: language, includedRegionCodes: REGIONS }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { suggestions?: Array<{ placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }> };
    return (json.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .slice(0, 6)
      .map((p) => ({ id: p.placeId, main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "", secondary: p.structuredFormat?.secondaryText?.text ?? "" }));
  } catch {
    return [];
  }
}

type Component = { longText?: string; shortText?: string; types?: string[] };

export async function placeDetails(placeId: string, sessionToken: string, language: "de" | "en"): Promise<PlaceDetails | null> {
  if (!placesConfigured() || !/^[\w-]{10,300}$/.test(placeId)) return null;
  try {
    const url = `${API}/places/${encodeURIComponent(placeId)}?languageCode=${language}&sessionToken=${encodeURIComponent(sessionToken)}`;
    const res = await fetch(url, { headers: headers("id,displayName,addressComponents,location,regularOpeningHours"), signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const p = (await res.json()) as {
      id: string;
      displayName?: { text?: string };
      addressComponents?: Component[];
      location?: { latitude?: number; longitude?: number };
      regularOpeningHours?: { periods?: Array<{ open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }> };
    };
    const part = (type: string, short = false) => {
      const c = p.addressComponents?.find((x) => x.types?.includes(type));
      return (short ? c?.shortText : c?.longText) ?? null;
    };
    // Swiss and German style: "Marktgasse 12".
    const street = [part("route"), part("street_number")].filter(Boolean).join(" ") || null;
    return {
      placeId: p.id,
      name: p.displayName?.text ?? "",
      street,
      zip: part("postal_code"),
      city: part("locality") ?? part("postal_town") ?? part("administrative_area_level_2"),
      country: (part("country", true) ?? "CH").toUpperCase().slice(0, 2),
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      hours: fromGooglePeriods(p.regularOpeningHours?.periods),
    };
  } catch {
    return null;
  }
}
