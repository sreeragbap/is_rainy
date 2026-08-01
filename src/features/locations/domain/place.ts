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

/** Stable key for a place: rounded coordinates, ~1.1 km apart at 2dp. */
export function placeKey(
  latitude: number,
  longitude: number,
  precision: number = COORDINATE_PRECISION,
): string {
  return `${round(latitude, precision).toFixed(precision)},${round(longitude, precision).toFixed(precision)}`;
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
