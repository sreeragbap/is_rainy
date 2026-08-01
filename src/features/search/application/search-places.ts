import { MAX_SEARCH_RESULTS } from "@/config/app";
import type { Place } from "@/features/locations/domain/place";
import type { GeocodingProvider } from "../domain/geocoding-provider";

/** Below this, results are noise — "a" matches half the world. */
export const MIN_QUERY_LENGTH = 2;

export async function searchPlaces(
  provider: GeocodingProvider,
  rawQuery: string,
): Promise<Place[]> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH) return [];

  return provider.search(query, MAX_SEARCH_RESULTS);
}
