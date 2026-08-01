import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DEVICE_COORDINATE_PRECISION } from "@/config/app";
import { toggleFavoritePlace } from "@/features/locations/application/manage-places";
import { FavoritesLimitError, makePlace, placeSchema } from "@/features/locations/domain/place";
import { placeRepository } from "@/features/locations/infrastructure/repository";
import { geocoder } from "@/features/search/infrastructure/geocoder";
import { errorResponse, PublicError } from "@/lib/api-error";
import { ensureClientId } from "@/lib/client-id";

/**
 * POST /api/locations/favorites
 *
 * Toggles a favourite and returns the resulting state, so the client never has
 * to guess which way the star went.
 */

const bodySchema = placeSchema.extend({
  /**
   * Name this point before saving it. A device reading arrives labelled "Your
   * location", which is meaningless in a saved list and would be written into
   * the shared `locations` row, renaming that city for everyone else. Resolving
   * here rather than in a separate client call keeps the star to one request.
   */
  resolveName: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new PublicError("A valid place is required.", 400);

    // Coordinates are kept at the finest precision the app uses, so a place
    // saved from a device reading records the spot the user was standing on
    // rather than the kilometre square around it. A searched city arrives
    // already rounded and is unaffected.
    let place = makePlace(
      {
        name: body.data.name,
        country: body.data.country,
        admin: body.data.admin,
        latitude: body.data.latitude,
        longitude: body.data.longitude,
      },
      DEVICE_COORDINATE_PRECISION,
    );

    if (body.data.resolveName) {
      const named = await geocoder.reverse(place.latitude, place.longitude);
      if (!named) {
        throw new PublicError("We couldn't name this spot, so there's nothing to save yet.", 422);
      }
      place = named;
    }

    const clientId = await ensureClientId();
    const favorited = await toggleFavoritePlace(placeRepository, clientId, place);

    return NextResponse.json({ favorited, place });
  } catch (error) {
    // The limit is a rule the user can act on, so it is shown, not swallowed.
    if (error instanceof FavoritesLimitError) {
      return errorResponse(new PublicError(error.message, 409));
    }
    return errorResponse(error);
  }
}
