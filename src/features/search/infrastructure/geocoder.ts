import type { GeocodingProvider } from "../domain/geocoding-provider";
import { OpenMeteoGeocoder } from "./open-meteo-geocoder";

/** Composition root for city search. */
export const geocoder: GeocodingProvider = new OpenMeteoGeocoder();
