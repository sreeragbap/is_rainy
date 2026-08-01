import { z } from "zod";
import { COORDINATE_PRECISION } from "@/config/app";

/**
 * A place a user can ask about.
 *
 * Identity is derived from coordinates rather than assigned by the database, so
 * the same place has the same id whether it arrived from a search result, from
 * localStorage, or from a stored favourite. That keeps the browser free of
 * database ids and makes list reconciliation trivial.
 */

const factor = 10 ** COORDINATE_PRECISION;

function round(value: number): number {
  return Math.round(value * factor) / factor;
}

/** Stable key for a place: rounded coordinates, ~1.1 km apart at 2dp. */
export function placeKey(latitude: number, longitude: number): string {
  return `${round(latitude).toFixed(COORDINATE_PRECISION)},${round(longitude).toFixed(COORDINATE_PRECISION)}`;
}

export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  /** ISO-3166 alpha-2. Empty when the provider omits it. */
  country: z.string().max(2),
  /** State, province, or region — shown only to disambiguate same-named cities. */
  admin: z.string().max(120).nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Place = z.infer<typeof placeSchema>;

/** Build a place with normalised coordinates and a derived id. */
export function makePlace(input: Omit<Place, "id">): Place {
  return {
    ...input,
    latitude: round(input.latitude),
    longitude: round(input.longitude),
    id: placeKey(input.latitude, input.longitude),
  };
}

/** How a place reads in one line: "Kochi, Kerala, IN". */
export function formatPlace(place: Place): string {
  return [place.name, place.admin, place.country].filter(Boolean).join(", ");
}

/** Raised when a client tries to exceed its favourites allowance. */
export class FavoritesLimitError extends Error {
  constructor(readonly limit: number) {
    super(`You can keep up to ${limit} favourites.`);
    this.name = "FavoritesLimitError";
  }
}
