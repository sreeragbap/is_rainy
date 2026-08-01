import { NextResponse, type NextRequest } from "next/server";
import { recordPlaceVisit } from "@/features/locations/application/manage-places";
import { makePlace, placeSchema } from "@/features/locations/domain/place";
import { placeRepository } from "@/features/locations/infrastructure/repository";
import { errorResponse, PublicError } from "@/lib/api-error";
import { ensureClientId } from "@/lib/client-id";

/**
 * POST /api/locations/recent
 *
 * Records that the user looked at a place. Fired on selection rather than on
 * every weather refresh, so "recent" reflects intent, not polling.
 *
 * Failure is reported but never blocks: the caller treats this as best-effort.
 */
export async function POST(request: NextRequest) {
  try {
    const body = placeSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new PublicError("A valid place is required.", 400);

    // Re-derive identity and coordinates server-side; a client-supplied id is
    // never trusted as the key to a shared row.
    const place = makePlace({
      name: body.data.name,
      country: body.data.country,
      admin: body.data.admin,
      latitude: body.data.latitude,
      longitude: body.data.longitude,
    });

    const clientId = await ensureClientId();
    await recordPlaceVisit(placeRepository, clientId, place);

    return NextResponse.json({ place });
  } catch (error) {
    return errorResponse(error);
  }
}
