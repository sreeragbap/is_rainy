import type { WeatherProvider } from "../domain/weather-provider";
import { OpenMeteoWeatherProvider } from "./open-meteo-provider";

/**
 * Composition root for the weather feature — the single line that decides which
 * provider the app uses. Changing sources means changing this file and nothing
 * else, because every caller depends on the `WeatherProvider` contract.
 */
export const weatherProvider: WeatherProvider = new OpenMeteoWeatherProvider();
