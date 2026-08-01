import { NextResponse, type NextRequest } from "next/server";
import { toggleFavoritePlace } from "@/features/locations/application/manage-places";
import { FavoritesLimitError, makePlace, placeSchema } from "@/features/locations/domain/place";
import { placeRepository } from "@/features/locations/infrastructure/repository";
import { errorResponse, PublicError } from "@/lib/api-error";
import { ensureClientId } from "@/lib/client-id";

/**
 * POST /api/locations/favorites
 *
 * Toggles a favourite and returns the resulting state, so the client never has
 * to guess which way the star went.
 */
export async function POST(request: NextRequest) {
  try {
    const body = placeSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new PublicError("A valid place is required.", 400);

    const place = makePlace({
      name: body.data.name,
      country: body.data.country,
      admin: body.data.admin,
      latitude: body.data.latitude,
      longitude: body.data.longitude,
    });

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
