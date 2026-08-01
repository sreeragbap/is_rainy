import { z } from "zod";
import { GEOCODING_CACHE_TTL_SECONDS, OPEN_METEO_GEOCODING_URL } from "@/config/app";
import { makePlace, type Place } from "@/features/locations/domain/place";
import { fetchJson } from "@/lib/http";
import type { GeocodingProvider } from "../domain/geocoding-provider";

/**
 * Open-Meteo geocoding adapter.
 *
 * Same provider as the forecast and equally key-free, so city search cannot
 * break independently of the weather itself.
 */

const responseSchema = z.object({
  // Absent entirely when nothing matches, rather than an empty array.
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export class OpenMeteoGeocoder implements GeocodingProvider {
  async search(query: string, limit: number): Promise<Place[]> {
    const url = new URL(OPEN_METEO_GEOCODING_URL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", String(limit));
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetchJson(url.toString(), {
      schema: responseSchema,
      revalidateSeconds: GEOCODING_CACHE_TTL_SECONDS,
    });

    const places = (response.results ?? []).map((result) =>
      makePlace({
        name: result.name,
        // The column is a 2-character code; anything longer is not one.
        country: result.country_code?.slice(0, 2).toUpperCase() ?? "",
        admin: result.admin1 ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
      }),
    );

    // Rounding coordinates can collapse two results onto one id (adjacent
    // districts of the same city). Keep the first, which ranks highest.
    return places.filter(
      (place, index) => places.findIndex((other) => other.id === place.id) === index,
    );
  }

  /**
   * Open-Meteo's geocoding API searches by name only — it has no reverse
   * endpoint — so this provider cannot name a coordinate. Callers treat null
   * as "unavailable" rather than "nowhere".
   */
  async reverse(): Promise<Place | null> {
    return null;
  }
}
