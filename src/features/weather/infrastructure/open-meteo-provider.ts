import { z } from "zod";
import {
  NOWCAST_HORIZON_MINUTES,
  OPEN_METEO_FORECAST_URL,
  WEATHER_CACHE_TTL_SECONDS,
} from "@/config/app";
import { fetchJson } from "@/lib/http";
import {
  classifyConditions,
  isWet,
  NOWCAST_TRIGGER_MM_PER_STEP,
  toneFor,
} from "../domain/rain-status";
import type { Coordinates, Nowcast, WeatherSnapshot } from "../domain/types";
import type { WeatherProvider } from "../domain/weather-provider";

/**
 * Open-Meteo adapter.
 *
 * Chosen because the core answer then needs no API key and faces no hourly
 * throttle, and because its 15-minutely precipitation is enough to say "rain
 * expected in about 20 minutes" — the one forecast this product makes.
 *
 * All times are requested as unix timestamps (`timeformat=unixtime`) so nowcast
 * arithmetic never has to parse a local-time string or reason about DST.
 */

/** Quarter-hour steps, matching Open-Meteo's `minutely_15` resolution. */
const STEP_SECONDS = 900;

/**
 * Open-Meteo always begins the 15-minutely series two steps in the past and
 * counts the in-progress step, so the first three entries are never forecast.
 * `past_minutely_15=0` does not suppress them — verified against the live API —
 * which means the request has to pay for them before the forward window starts.
 */
const LEADING_NON_FORECAST_STEPS = 3;

/** Steps requested: the unavoidable lead-in, the horizon, and one spare. */
const NOWCAST_STEPS =
  LEADING_NON_FORECAST_STEPS + Math.ceil((NOWCAST_HORIZON_MINUTES * 60) / STEP_SECONDS) + 1;

const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "wind_speed_10m",
] as const;

const MINUTELY_FIELDS = ["precipitation", "weather_code"] as const;

const responseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.number(),
    /** Seconds the `current` values are aggregated over — 900 or 3600. */
    interval: z.number().positive(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    is_day: z.number(),
    precipitation: z.number(),
    rain: z.number(),
    showers: z.number(),
    snowfall: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
  }),
  minutely_15: z
    .object({
      time: z.array(z.number()),
      precipitation: z.array(z.number().nullable()),
    })
    .optional(),
});

type OpenMeteoResponse = z.infer<typeof responseSchema>;

function buildUrl({ latitude, longitude }: Coordinates): string {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT_FIELDS.join(","));
  url.searchParams.set("minutely_15", MINUTELY_FIELDS.join(","));
  url.searchParams.set("forecast_minutely_15", String(NOWCAST_STEPS));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("timeformat", "unixtime");
  // Requested explicitly rather than relying on defaults, so a change upstream
  // cannot silently switch us to Fahrenheit or inches.
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  return url.toString();
}

/**
 * Open-Meteo reports `current` precipitation as a total over `interval`
 * seconds, not a rate. Normalise to mm/h so thresholds mean one thing.
 */
function liquidRateMmPerHour(current: OpenMeteoResponse["current"]): number {
  const perHour = 3600 / current.interval;
  const split = current.rain + current.showers;

  // Prefer the rain/showers split; some models populate only the total, in
  // which case fall back to it — but only when nothing frozen is falling, so
  // melted snow is never counted as rain.
  const liquid = split > 0 || current.snowfall > 0 ? split : current.precipitation;
  return Math.max(0, liquid * perHour);
}

/**
 * Find when rain starts or stops within the horizon.
 *
 * `minutely_15.precipitation` is millimetres accumulated in each 15-minute
 * step, so it is compared against a per-step threshold rather than an
 * hourly rate.
 */
export function buildNowcast(
  response: Pick<OpenMeteoResponse, "minutely_15">,
  currentlyWet: boolean,
  nowSeconds: number,
): Nowcast {
  const base: Nowcast = {
    minutesUntilRain: null,
    minutesUntilDry: null,
    horizonMinutes: NOWCAST_HORIZON_MINUTES,
    available: false,
  };

  const series = response.minutely_15;
  if (!series || series.time.length === 0) return base;

  const horizonEnd = nowSeconds + NOWCAST_HORIZON_MINUTES * 60;
  let sawUsableStep = false;

  for (const [index, timestamp] of series.time.entries()) {
    // Skip the in-progress step: its precipitation is already reflected in the
    // current conditions, and reporting "rain in 0 minutes" is not advice.
    if (timestamp <= nowSeconds) continue;
    if (timestamp > horizonEnd) break;

    const millimetres = series.precipitation[index];
    if (millimetres === null || millimetres === undefined) continue;

    sawUsableStep = true;
    const stepIsWet = millimetres >= NOWCAST_TRIGGER_MM_PER_STEP;
    if (stepIsWet === currentlyWet) continue;

    // Round to the nearest 5 minutes: the data is quarter-hourly, so a precise
    // figure would imply accuracy the forecast does not have.
    const minutes = Math.max(5, Math.round((timestamp - nowSeconds) / 60 / 5) * 5);

    return {
      ...base,
      available: true,
      minutesUntilRain: currentlyWet ? null : minutes,
      minutesUntilDry: currentlyWet ? minutes : null,
    };
  }

  return { ...base, available: sawUsableStep };
}

/**
 * How old an observation may be before the cached copy is distrusted.
 *
 * Next's Data Cache serves stale entries while revalidating in the background,
 * so the first request after a quiet spell can receive an arbitrarily old
 * payload. Observations are 15-minute aggregates, so anything past two
 * intervals means the cache — not the provider — is behind, and the answer is
 * refetched directly. Serving yesterday's storm as "now" would break the one
 * promise this product makes.
 */
const MAX_OBSERVATION_AGE_SECONDS = 30 * 60;

export class OpenMeteoWeatherProvider implements WeatherProvider {
  async getSnapshot(coordinates: Coordinates): Promise<WeatherSnapshot> {
    const url = buildUrl(coordinates);

    let response = await fetchJson(url, {
      schema: responseSchema,
      revalidateSeconds: WEATHER_CACHE_TTL_SECONDS,
    });

    if (Date.now() / 1000 - response.current.time > MAX_OBSERVATION_AGE_SECONDS) {
      response = await fetchJson(url, { schema: responseSchema, revalidateSeconds: 0 });
    }

    const { current } = response;
    const precipitation = liquidRateMmPerHour(current);

    const status = classifyConditions({
      precipitationMm: precipitation,
      snowfallCm: current.snowfall,
      weatherCode: current.weather_code,
    });

    // Anchored to the wall clock, not to `current.time`. The observation is the
    // start of a 15-minute interval, so anchoring there could announce rain in
    // "15 minutes" when it is two minutes away. A cached payload is at most
    // WEATHER_CACHE_TTL_SECONDS old, which is far less drift than that.
    const nowcast = buildNowcast(response, isWet(status), Math.floor(Date.now() / 1000));

    return {
      status,
      tone: toneFor(status),
      isRaining: isWet(status),
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      precipitation,
      windSpeed: current.wind_speed_10m,
      humidity: current.relative_humidity_2m,
      isDay: current.is_day === 1,
      observedAt: new Date(current.time * 1000).toISOString(),
      timezone: response.timezone,
      nowcast,
      // The coordinates asked about, not the model grid cell Open-Meteo snapped
      // to — the answer belongs to the place the user chose.
      coordinates,
    };
  }
}
