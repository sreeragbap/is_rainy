import { z } from "zod";
import {
  GEOCODING_CACHE_TTL_SECONDS,
  NOMINATIM_SEARCH_URL,
  NOMINATIM_USER_AGENT,
} from "@/config/app";
import { formatPlace, makePlace, type Place } from "@/features/locations/domain/place";
import { fetchJson } from "@/lib/http";
import type { GeocodingProvider } from "../domain/geocoding-provider";

/**
 * Nominatim (OpenStreetMap) geocoding adapter.
 *
 * Key-free like the forecast provider, but with a usage policy: requests must
 * carry an identifying User-Agent and stay under one per second. The 24-hour
 * cache in front of this adapter means each distinct query costs Nominatim one
 * request per day, however many people type it.
 */

const resultSchema = z.object({
  /** Nominatim serialises coordinates as strings. */
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  name: z.string(),
  display_name: z.string(),
  address: z
    .object({
      country_code: z.string().optional(),
      state: z.string().optional(),
      province: z.string().optional(),
      county: z.string().optional(),
    })
    .optional(),
});

/** A bare array — no envelope object, unlike Open-Meteo. */
const responseSchema = z.array(resultSchema);

/** State-level context, whichever field this country's OSM data uses. */
function adminOf(address: z.infer<typeof resultSchema>["address"]): string | null {
  return address?.state ?? address?.province ?? address?.county ?? null;
}

export class NominatimGeocoder implements GeocodingProvider {
  async search(query: string, limit: number): Promise<Place[]> {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");
    // Cities, towns, and villages only: this product answers "is it raining
    // where I might walk?", not "where is this street?".
    url.searchParams.set("featuretype", "settlement");
    url.searchParams.set("accept-language", "en");

    const response = await fetchJson(url.toString(), {
      schema: responseSchema,
      revalidateSeconds: GEOCODING_CACHE_TTL_SECONDS,
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });

    const places = response
      .map((result) => {
        // `name` can be empty for odd OSM records; the display name's first
        // segment is the same label in that case.
        const name = result.name || result.display_name.split(",")[0]?.trim();
        if (!name) return null;

        return makePlace({
          name,
          // The column is a 2-character code; anything longer is not one.
          country: result.address?.country_code?.slice(0, 2).toUpperCase() ?? "",
          admin: adminOf(result.address),
          latitude: result.lat,
          longitude: result.lon,
        });
      })
      .filter((place): place is Place => place !== null);

    // Two dedup passes, keeping the first (highest-ranked) of each pair:
    // rounding can collapse adjacent districts onto one id, and Nominatim can
    // return distinct OSM records that read identically to a human — e.g. the
    // Paris commune and its historic centre, both "Paris, Ile-de-France, FR".
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();
    return places.filter((place) => {
      const label = formatPlace(place);
      if (seenIds.has(place.id) || seenLabels.has(label)) return false;
      seenIds.add(place.id);
      seenLabels.add(label);
      return true;
    });
  }
}
