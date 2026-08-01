import type { Place } from "@/features/locations/domain/place";

/**
 * Contract for turning what someone typed into places they can pick.
 *
 * Returns the shared `Place` shape so a search result, a recent, and a
 * favourite are interchangeable everywhere downstream.
 */
export interface GeocodingProvider {
  search(query: string, limit: number): Promise<Place[]>;
}
