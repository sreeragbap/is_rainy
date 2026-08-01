/**
 * Application constants. Anything tunable about product behaviour lives here,
 * never inline in components or services.
 */

/** How often the client re-fetches current conditions. */
export const REFRESH_INTERVAL_MS = 60_000;

/**
 * Server-side cache window per location. Keeps the answer fresher than the
 * client refresh cycle, so a refresh never returns data the previous one
 * already had, while collapsing concurrent viewers of the same city.
 */
export const WEATHER_CACHE_TTL_SECONDS = 30;

/** Cache window for geocoding. City coordinates effectively never change. */
export const GEOCODING_CACHE_TTL_SECONDS = 60 * 60 * 24;

/**
 * How far ahead the nowcast is scanned for the "rain expected in N minutes"
 * insight. Beyond ~30 minutes the advice stops being actionable for someone
 * deciding whether to step outside right now.
 */
export const NOWCAST_HORIZON_MINUTES = 30;

/** Coordinate precision used for cache keys and dedup: 2dp ≈ 1.1 km. */
export const COORDINATE_PRECISION = 2;

/** Upstream request timeout. Past this we prefer an error over a spinner. */
export const UPSTREAM_TIMEOUT_MS = 6_000;

/** Maximum recent searches remembered per client. */
export const MAX_RECENT_SEARCHES = 5;

/** Maximum favourite locations per client. */
export const MAX_FAVORITES = 10;

/** Maximum results returned by city search. */
export const MAX_SEARCH_RESULTS = 6;

/** Name of the first-party cookie holding the anonymous client id. */
export const CLIENT_ID_COOKIE = "israiny_cid";

/** Anonymous client id cookie lifetime: one year. */
export const CLIENT_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Open-Meteo serves both endpoints we need, with no API key and no hourly
 * throttle. Forecast gives current conditions plus the 15-minutely
 * precipitation nowcast; geocoding resolves searched city names to coordinates.
 */
export const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
export const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
