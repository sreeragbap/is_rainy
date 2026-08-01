"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
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
 *  2. If location permission is already granted, the device's current
 *     coordinates replace it silently. No prompt, and the user may have moved
 *     since last time.
 *  3. With no stored place at all, the device is asked (one permission prompt,
 *     first visit only).
 *  4. Otherwise nothing, and the UI asks for a city.
 *
 * Anything the user does by hand — searching a city, tapping the locate
 * button — always wins over the automatic steps.
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

  // Set the moment the user picks a place by hand this session, so a slow
  // automatic location fix arriving afterwards cannot yank the screen away
  // from what they explicitly asked for.
  const userChoseThisSession = useRef(false);

  const requestDeviceLocation = useCallback((options?: { auto?: boolean }) => {
    const auto = options?.auto === true;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      setResolving(false);
      return;
    }

    if (!auto) setPermission("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (auto && userChoseThisSession.current) return;

        const next = devicePlace(position.coords.latitude, position.coords.longitude);
        setPlace(next);
        setSource("device");
        setPermission("granted");
        setResolving(false);
        // Remembered so a reload shows something instantly, but not recorded
        // as a recent search: the user never asked for this place by name.
        writeLocal(STORAGE_KEYS.selectedPlace, { place: next, source: "device" });
      },
      (error) => {
        // A silent refresh must not tear down what is already on screen: only
        // an actual permission revocation is recorded. A timeout or a missing
        // GPS fix keeps the stored place and stays quiet.
        if (!auto || error.code === error.PERMISSION_DENIED) setPermission("denied");
        setResolving(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  // Runs once: restore instantly, then prefer the current location when it is
  // available without a prompt.
  useEffect(() => {
    const stored = readLocal(STORAGE_KEYS.selectedPlace, storedSchema);
    if (stored) {
      setPlace(stored.place);
      setSource(stored.source);
      setResolving(false);
    } else {
      // First visit: worth one permission prompt to answer for "here".
      requestDeviceLocation();
      return;
    }

    // Silently upgrade to the current location — but never prompt a returning
    // user. The Permissions API says whether access is already granted; where
    // it is unavailable, a previously stored device place implies the same.
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          if (status.state === "granted") requestDeviceLocation({ auto: true });
        })
        .catch(() => {});
    } else if (stored.source === "device") {
      requestDeviceLocation({ auto: true });
    }
  }, [requestDeviceLocation]);

  const select = useCallback((next: Place) => {
    userChoseThisSession.current = true;
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
