"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { DEVICE_COORDINATE_PRECISION } from "@/config/app";
import { apiPost } from "@/lib/api-client";
import { readLocal, STORAGE_KEYS, writeLocal } from "@/lib/local-store";
import { makePlace, placeSchema, type Place } from "../domain/place";

/**
 * Which place the app is currently answering for.
 *
 * The product's default subject is "here": the question on the door of the
 * building you are standing in. So the current location is preselected whenever
 * it can be had without nagging, and searched places exist for switching away.
 *
 * Resolution order on open:
 *
 *  1. The last viewed place from localStorage, shown immediately — an instant
 *     answer beats a spinner while the GPS warms up.
 *  2. With no stored place at all, the device is asked (one permission prompt,
 *     first visit only).
 *  3. Otherwise nothing, and the UI asks for a city.
 *
 * A reload never moves the place on its own: the device's current coordinates
 * are only fetched again when the user taps the locate button.
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
  return makePlace(
    {
      name: DEVICE_PLACE_NAME,
      country: "",
      admin: null,
      latitude,
      longitude,
    },
    DEVICE_COORDINATE_PRECISION,
  );
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
        // Remembered so a reload shows something instantly, but not recorded
        // as a recent search: the user never asked for this place by name.
        writeLocal(STORAGE_KEYS.selectedPlace, { place: next, source: "device" });
      },
      () => {
        setPermission("denied");
        setResolving(false);
      },
      // High accuracy because the request is always a deliberate tap now, and
      // a coarse network fix can land in a different weather cell than the one
      // the user is standing in. `maximumAge: 0` for the same reason: asking
      // again should mean asking again, not replaying an old fix.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, []);

  // Runs once: restore what was on screen last time and stop there. Fetching
  // fresh coordinates is always an explicit act via the locate button.
  useEffect(() => {
    const stored = readLocal(STORAGE_KEYS.selectedPlace, storedSchema);
    if (stored) {
      setPlace(stored.place);
      setSource(stored.source);
      setResolving(false);
    } else {
      // First visit: worth one permission prompt to answer for "here".
      requestDeviceLocation();
    }
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
