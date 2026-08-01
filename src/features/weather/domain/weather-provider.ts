import type { Coordinates, WeatherSnapshot } from "./types";

/**
 * The contract every weather source must satisfy.
 *
 * The application layer depends on this, never on a provider. Swapping
 * Open-Meteo for another source is one new file implementing this interface
 * plus one line in the composition root — no feature code changes.
 */
export interface WeatherProvider {
  getSnapshot(coordinates: Coordinates): Promise<WeatherSnapshot>;
}
