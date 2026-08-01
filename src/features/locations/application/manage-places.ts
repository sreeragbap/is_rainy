import { MAX_FAVORITES, MAX_RECENT_SEARCHES } from "@/config/app";
import type { Place } from "../domain/place";
import type { PlaceRepository } from "../domain/place-repository";

/**
 * Use cases for a client's saved places.
 *
 * Reads degrade instead of failing. Remembering places is a convenience layered
 * on top of the product; if the database is unreachable — or simply not
 * configured yet — the app must still answer whether it is raining. Writes do
 * surface their failure, because a user who taps a star deserves to know it
 * did not stick.
 */

export interface SavedPlaces {
  recent: Place[];
  favorites: Place[];
  /** True when storage could not be reached, so the UI can stay quiet about it. */
  degraded: boolean;
}

const EMPTY: SavedPlaces = { recent: [], favorites: [], degraded: true };

export async function listSavedPlaces(
  repository: PlaceRepository,
  clientId: string,
): Promise<SavedPlaces> {
  try {
    const [recent, favorites] = await Promise.all([
      repository.listRecent(clientId, MAX_RECENT_SEARCHES),
      repository.listFavorites(clientId),
    ]);
    return { recent, favorites, degraded: false };
  } catch (error) {
    console.error("[israiny] could not read saved places:", error);
    return EMPTY;
  }
}

export async function recordPlaceVisit(
  repository: PlaceRepository,
  clientId: string,
  place: Place,
): Promise<void> {
  await repository.recordSearch(clientId, place, MAX_RECENT_SEARCHES);
}

export async function toggleFavoritePlace(
  repository: PlaceRepository,
  clientId: string,
  place: Place,
): Promise<boolean> {
  return repository.toggleFavorite(clientId, place, MAX_FAVORITES);
}
