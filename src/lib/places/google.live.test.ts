import { describe, expect, it } from "vitest";
import { formatHours } from "@/lib/shop/hours";
import { placeDetails, searchPlaces } from "./google";

// Real Google Places requests (billed per use): PLACES_LIVE=1 npx vitest run src/lib/places/google.live.test.ts
describe.skipIf(!process.env.PLACES_LIVE)("Google Places live", () => {
  it("finds a business and takes over address, position and opening hours", async () => {
    const session = crypto.randomUUID();
    const results = await searchPlaces("Hürlimannbad Zürich", session, "de");
    console.log(results.slice(0, 3));
    expect(results.length).toBeGreaterThan(0);
    const place = await placeDetails(results[0].id, session, "de");
    console.log({ ...place, hours: place?.hours ? formatHours(place.hours, "de") : null });
    expect(place?.city).toBeTruthy();
    expect(place?.lat).toBeTypeOf("number");
  }, 30_000);
});
