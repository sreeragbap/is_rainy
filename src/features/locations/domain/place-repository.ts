import type { Place } from "./place";

/**
 * Persistence contract for a client's places.
 *
 * Scoped by anonymous client id in every method — there is no way to read
 * another visitor's history through this interface, because there is no method
 * that omits the scope.
 */
export interface PlaceRepository {
  listRecent(clientId: string, limit: number): Promise<Place[]>;
  listFavorites(clientId: string): Promise<Place[]>;

  /** Records a visit, keeping only the most recent `limit` entries. */
  recordSearch(clientId: string, place: Place, limit: number): Promise<void>;

  /** Adds or removes a favourite. Returns true when it is now a favourite. */
  toggleFavorite(clientId: string, place: Place, limit: number): Promise<boolean>;
}
