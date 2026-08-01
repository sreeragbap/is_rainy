"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { apiPost } from "@/lib/api-client";
import { readLocal, STORAGE_KEYS, writeLocal } from "@/lib/local-store";
import { makePlace, placeSchema, type Place } from "../domain/place";

/**
 * Which place the app is currently answering for.
 *
 * Resolution order is chosen to reach an answer in as few seconds as possible:
 *
 *  1. The place the user last looked at, restored from localStorage. Instant,
 *     and correct for the overwhelmingly common case of reopening the app in the
 *     same building.
 *  2. Otherwise the device's coordinates, which need a permission prompt.
 *  3. Otherwise nothing, and the UI asks for a city.
 *
 * Geolocation is only requested when there is no stored place, so returning
 * users are never prompted again.
 */

export const DEVICE_PLACE_NAME = "Your location";

/** How the current place was chosen. Determines whether it is worth remembering. */
export type PlaceSource = "device" | "chosen";

export type LocationPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported";

const storedSchema = z.object({
  place: placeSchema,
  source: z.enum(["device", "chosen"]),
});

/** Device coordinates are only ever this precise to the user: "here". */
function devicePlace(latitude: number, longitude: number): Place {
  return makePlace({
    name: DEVICE_PLACE_NAME,
    country: "",
    admin: null,
    latitude,
    longitude,
  });
}

export function isDevicePlace(place: Place): boolean {
  return place.name === DEVICE_PLACE_NAME && place.country === "";
}

export interface ActivePlace {
  place: Place | null;
  source: PlaceSource | null;
  permission: LocationPermissionState;
  /** Still deciding which place to show — distinct from "no place found". */
  resolving: boolean;
  select: (place: Place) => void;
  requestDeviceLocation: () => void;
}

export function useActivePlace(): ActivePlace {
  const [place, setPlace] = useState<Place | null>(null);
  const [source, setSource] = useState<PlaceSource | null>(null);
  const [permission, setPermission] = useState<LocationPermissionState>("idle");
  const [resolving, setResolving] = useState(true);

  const requestDeviceLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      setResolving(false);
      return;
    }

    setPermission("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = devicePlace(position.coords.latitude, position.coords.longitude);
        setPlace(next);
        setSource("device");
        setPermission("granted");
        setResolving(false);
        // Remembered so a reload does not re-prompt, but not recorded as a
        // recent search: the user never asked for this place by name.
        writeLocal(STORAGE_KEYS.selectedPlace, { place: next, source: "device" });
      },
      () => {
        setPermission("denied");
        setResolving(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  // Runs once: restore, or fall back to asking the device where we are.
  useEffect(() => {
    const stored = readLocal(STORAGE_KEYS.selectedPlace, storedSchema);
    if (stored) {
      setPlace(stored.place);
      setSource(stored.source);
      setResolving(false);
      return;
    }
    requestDeviceLocation();
  }, [requestDeviceLocation]);

  const select = useCallback((next: Place) => {
    setPlace(next);
    setSource("chosen");
    setResolving(false);
    writeLocal(STORAGE_KEYS.selectedPlace, { place: next, source: "chosen" });

    // Best-effort: recents are a convenience, so a storage failure here must
    // never interrupt showing the answer the user just asked for.
    void apiPost("/api/locations/recent", next, z.object({ place: placeSchema })).catch(() => {});
  }, []);

  return { place, source, permission, resolving, select, requestDeviceLocation };
}
