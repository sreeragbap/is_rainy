import { buildInsight } from "@/features/insight/application/build-insight";
import { COORDINATE_PRECISION } from "@/config/app";
import type { WeatherAnswer } from "../domain/answer";
import type { Coordinates } from "../domain/types";
import type { WeatherProvider } from "../domain/weather-provider";

/**
 * The use case behind `GET /api/weather`.
 *
 * Fetches conditions through the provider contract and derives the advice. The
 * advice is computed here rather than in the browser so the answer is
 * canonical — two devices looking at the same city are told the same thing —
 * and so the rules never ship to the client.
 */

/**
 * Coordinates are rounded before they reach the provider. At two decimal places
 * (~1.1 km) the answer is unchanged, while every visitor in the same
 * neighbourhood shares one cache entry and one upstream request.
 */
export function roundCoordinates({ latitude, longitude }: Coordinates): Coordinates {
  const factor = 10 ** COORDINATE_PRECISION;
  return {
    latitude: Math.round(latitude * factor) / factor,
    longitude: Math.round(longitude * factor) / factor,
  };
}

export async function getWeatherAnswer(
  provider: WeatherProvider,
  coordinates: Coordinates,
): Promise<WeatherAnswer> {
  const snapshot = await provider.getSnapshot(roundCoordinates(coordinates));

  return {
    snapshot,
    insight: buildInsight(snapshot),
    fetchedAt: new Date().toISOString(),
  };
}
