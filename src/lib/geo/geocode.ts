import "server-only";

/**
 * Address → coordinates via Mapbox (server-side, MAPBOX_TOKEN). Without a token or on failure the
 * location simply has no coordinates: the shop then shows the address and a route link only.
 */
export async function geocode(address: { street?: string | null; zip?: string | null; city?: string | null; country?: string | null }): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.MAPBOX_TOKEN;
  const q = [address.street, [address.zip, address.city].filter(Boolean).join(" "), address.country].filter(Boolean).join(", ");
  if (!token || q.length < 4) return null;
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&limit=1&access_token=${encodeURIComponent(token)}${address.country ? `&country=${encodeURIComponent(address.country.toLowerCase())}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> };
    const c = json.features?.[0]?.geometry?.coordinates;
    return c ? { lng: c[0], lat: c[1] } : null;
  } catch {
    return null;
  }
}

/** Static map image (public Mapbox token in the URL; restrict it to your domains in Mapbox). */
export function staticMapUrl(points: Array<{ lat: number; lng: number }>, color = "ff4b23", size = "640x320"): string | null {
  const token = process.env.MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_TOKEN;
  if (!token || !points.length) return null;
  const pins = points.slice(0, 20).map((p) => `pin-l+${color.replace("#", "")}(${p.lng.toFixed(5)},${p.lat.toFixed(5)})`).join(",");
  const view = points.length === 1 ? `${points[0].lng.toFixed(5)},${points[0].lat.toFixed(5)},14` : "auto";
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins}/${view}/${size}@2x?padding=60&access_token=${encodeURIComponent(token)}`;
}

/** A route link that opens Apple Maps on iPhones and Google Maps everywhere else. */
export function routeUrl(l: { lat: number | null; lng: number | null; street?: string | null; zip?: string | null; city?: string | null }): string {
  const q = l.lat !== null && l.lng !== null ? `${l.lat},${l.lng}` : [l.street, l.zip, l.city].filter(Boolean).join(", ");
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}
