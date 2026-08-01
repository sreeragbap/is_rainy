import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getWeatherAnswer } from "@/features/weather/application/get-weather-answer";
import { weatherProvider } from "@/features/weather/infrastructure/provider";
import { errorResponse, PublicError } from "@/lib/api-error";

/**
 * GET /api/weather?lat=..&lon=..
 *
 * The only endpoint the core experience depends on. A thin adapter: parse,
 * delegate, serialise. Upstream caching happens inside the provider, so this
 * handler holds no caching logic of its own.
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

    const answer = await getWeatherAnswer(weatherProvider, {
      latitude: params.data.lat,
      longitude: params.data.lon,
    });

    return NextResponse.json(answer);
  } catch (error) {
    return errorResponse(error);
  }
}
