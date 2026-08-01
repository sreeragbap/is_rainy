import type { Place } from "@/features/locations/domain/place";

/**
 * Contract for turning what someone typed into places they can pick.
 *
 * Returns the shared `Place` shape so a search result, a recent, and a
 * favourite are interchangeable everywhere downstream.
 */
export interface GeocodingProvider {
  search(query: string, limit: number): Promise<Place[]>;

  /**
   * Name the settlement containing a pair of coordinates.
   *
   * A device reading arrives as numbers with no label, and a place someone
   * keeps has to be recognisable in a list a week later. Returns null when the
   * provider offers no reverse lookup, or when nothing nameable sits at that
   * point — open sea, for instance.
   */
  reverse(latitude: number, longitude: number): Promise<Place | null>;
}
