import { z } from "zod";
import {
  DEVICE_COORDINATE_PRECISION,
  GEOCODING_CACHE_TTL_SECONDS,
  NOMINATIM_REVERSE_URL,
  NOMINATIM_REVERSE_ZOOM,
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
      // Settlement fields, most specific first. Which one is populated depends
      // on how the place is classified in OSM, not on how large it is.
      village: z.string().optional(),
      hamlet: z.string().optional(),
      town: z.string().optional(),
      municipality: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
});

/** A bare array — no envelope object, unlike Open-Meteo. */
const responseSchema = z.array(resultSchema);

/**
 * Reverse returns a single object, and answers "nothing here" with an `error`
 * field rather than an HTTP status — mid-ocean coordinates, typically.
 */
const reverseResponseSchema = z.union([
  resultSchema.partial({ name: true }),
  z.object({ error: z.string() }),
]);

type ReverseHit = Extract<z.infer<typeof reverseResponseSchema>, { display_name: string }>;

/**
 * The settlement name for a reverse hit.
 *
 * Read from the address hierarchy, most specific first, because the record's
 * own `name` describes whatever feature happened to match: in a village it is
 * the village, but in a city it is a suburb — "Valummel" rather than "Kochi".
 * The hierarchy answers the question the user is actually asking, which is
 * what they would say if someone asked where they are.
 *
 * `name` is the fallback for places whose address carries no settlement at all,
 * and `display_name` for the rare record with neither.
 */
function settlementName(result: ReverseHit): string | null {
  const address = result.address;
  const candidate =
    address?.village ??
    address?.town ??
    address?.municipality ??
    address?.city ??
    address?.hamlet ??
    result.name?.trim() ??
    result.display_name.split(",")[0];

  return candidate?.trim() || null;
}

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

  async reverse(latitude: number, longitude: number): Promise<Place | null> {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", String(NOMINATIM_REVERSE_ZOOM));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const response = await fetchJson(url.toString(), {
      schema: reverseResponseSchema,
      revalidateSeconds: GEOCODING_CACHE_TTL_SECONDS,
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });

    if ("error" in response) return null;

    const name = settlementName(response);
    if (!name) return null;

    // Built on the coordinates asked about, not the ones Nominatim answers
    // with — the user is standing here; the settlement is only its label — and
    // kept at full device precision, because this exact point is the thing
    // worth remembering.
    return makePlace(
      {
        name,
        country: response.address?.country_code?.slice(0, 2).toUpperCase() ?? "",
        admin: adminOf(response.address),
        latitude,
        longitude,
      },
      DEVICE_COORDINATE_PRECISION,
    );
  }
}
