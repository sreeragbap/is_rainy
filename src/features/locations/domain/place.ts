import { COORDINATE_PRECISION } from "@/config/app";
import { z } from "zod";

/**
 * A place a user can ask about.
 *
 * Identity is derived from coordinates rather than assigned by the database, so
 * the same place has the same id whether it arrived from a search result, from
 * localStorage, or from a stored favourite. That keeps the browser free of
 * database ids and makes list reconciliation trivial.
 */

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Stable key for a place: rounded coordinates, ~1.1 km apart at 2dp.
 *
 * Written unpadded, so a coordinate carries the same key whatever ceiling it
 * was normalised under — 9.93 is "9.93" whether it was rounded to two decimals
 * or to four. Only genuinely finer coordinates produce a longer key.
 */
export function placeKey(
  latitude: number,
  longitude: number,
  precision: number = COORDINATE_PRECISION,
): string {
  return `${round(latitude, precision)},${round(longitude, precision)}`;
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

/**
 * Build a place with normalised coordinates and a derived id.
 *
 * City coordinates are deliberately coarse — two searches for the same city
 * must produce one id. A device reading passes a finer precision instead: the
 * user is standing at that point, and rounding it to the nearest kilometre can
 * hand the forecast a different grid cell than the one they are in.
 */
export function makePlace(
  input: Omit<Place, "id">,
  precision: number = COORDINATE_PRECISION,
): Place {
  return {
    ...input,
    latitude: round(input.latitude, precision),
    longitude: round(input.longitude, precision),
    id: placeKey(input.latitude, input.longitude, precision),
  };
}

/**
 * The key two places share when they are the same place.
 *
 * A device reading keeps more decimals than a searched city, and the database
 * stores everything at the coarse precision, so raw ids from those three
 * sources never match even when they describe one spot. Comparing at the
 * coarse precision is what makes "is this place a favourite?" answerable.
 */
export function sameKey(place: Place): string {
  return placeKey(place.latitude, place.longitude);
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
