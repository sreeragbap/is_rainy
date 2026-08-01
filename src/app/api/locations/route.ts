import { NextResponse } from "next/server";
import { listSavedPlaces } from "@/features/locations/application/manage-places";
import { placeRepository } from "@/features/locations/infrastructure/repository";
import { errorResponse } from "@/lib/api-error";
import { readClientId } from "@/lib/client-id";

/**
 * GET /api/locations
 *
 * A client's recents and favourites in one round trip. Returns empty lists for
 * a first-time visitor, and no cookie is minted here — identity is created when
 * the user first expresses intent, not merely by loading the page.
 */
export async function GET() {
  try {
    const clientId = await readClientId();
    if (!clientId) {
      return NextResponse.json({ recent: [], favorites: [], degraded: false });
    }

    return NextResponse.json(await listSavedPlaces(placeRepository, clientId));
  } catch (error) {
    return errorResponse(error);
  }
}
