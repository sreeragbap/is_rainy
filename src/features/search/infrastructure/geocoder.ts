import type { GeocodingProvider } from "../domain/geocoding-provider";
import { NominatimGeocoder } from "./nominatim-geocoder";

/**
 * Composition root for city search.
 *
 * Currently Nominatim (OpenStreetMap); to switch back to Open-Meteo, swap in
 * `new OpenMeteoGeocoder()` from ./open-meteo-geocoder — both implement the
 * same contract.
 */
export const geocoder: GeocodingProvider = new NominatimGeocoder();
