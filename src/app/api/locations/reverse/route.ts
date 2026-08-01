import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { geocoder } from "@/features/search/infrastructure/geocoder";
import { errorResponse, PublicError } from "@/lib/api-error";

/**
 * GET /api/locations/reverse?lat=..&lon=..
 *
 * The name of the place at a pair of coordinates. A device reading arrives as
 * numbers only, so this is what turns "Your location" into somewhere the user
 * recognises — on screen the moment they tap locate, and in the saved list
 * afterwards.
 *
 * `place: null` means the lookup succeeded but found nothing nameable, which
 * the caller handles as its own case rather than as a failure.
 */

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.safeParse({
      lat: request.nextUrl.searchParams.get("lat"),
      lon: request.nextUrl.searchParams.get("lon"),
    });

    if (!params.success) {
      throw new PublicError("A valid latitude and longitude are required.", 400);
    }

    const place = await geocoder.reverse(params.data.lat, params.data.lon);
    return NextResponse.json({ place });
  } catch (error) {
    return errorResponse(error);
  }
}
