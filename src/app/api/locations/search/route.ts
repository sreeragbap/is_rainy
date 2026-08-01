import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/features/search/application/search-places";
import { geocoder } from "@/features/search/infrastructure/geocoder";
import { errorResponse } from "@/lib/api-error";

/**
 * GET /api/locations/search?q=..
 *
 * City search. A short or empty query returns an empty list rather than an
 * error — the user is mid-typing, which is not a mistake.
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const results = await searchPlaces(geocoder, query);

    return NextResponse.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
