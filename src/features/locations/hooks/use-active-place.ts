"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DEVICE_COORDINATE_PRECISION } from "@/config/app";
import { apiGet, apiPost } from "@/lib/api-client";
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
 *
 * A fresh reading is shown as "Your location" the instant it arrives and is
 * named a moment later, once the settlement it sits in has been looked up. The
 * answer is never held back for that lookup — knowing whether it is raining
 * matters more than knowing what the place is called.
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

/** True while a device reading is still unnamed — coordinates and nothing else. */
export function isDevicePlace(place: Place): boolean {
  return place.name === DEVICE_PLACE_NAME && place.country === "";
}

const reverseSchema = z.object({ place: placeSchema.nullable() });

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

  // The place the app is answering for right now. A name arriving late must
  // not overwrite a place the user has since switched to.
  const currentId = useRef<string | null>(null);

  /**
   * Replace an unnamed reading with the settlement it sits in.
   *
   * Coordinates are unchanged, so the id is too, and the weather request
   * already in flight is neither cancelled nor repeated — only the label
   * changes. A failed or empty lookup leaves "Your location" standing, which
   * is imprecise but never wrong.
   */
  const nameDevicePlace = useCallback((reading: Place) => {
    const query = new URLSearchParams({
      lat: String(reading.latitude),
      lon: String(reading.longitude),
    });

    void apiGet(`/api/locations/reverse?${query}`, reverseSchema)
      .then(({ place: named }) => {
        if (!named || currentId.current !== reading.id) return;
        setPlace(named);
        writeLocal(STORAGE_KEYS.selectedPlace, { place: named, source: "device" });
      })
      .catch(() => {});
  }, []);

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
        currentId.current = next.id;
        setPlace(next);
        setSource("device");
        setPermission("granted");
        setResolving(false);
        // Remembered so a reload shows something instantly, but not recorded
        // as a recent search: the user never asked for this place by name.
        writeLocal(STORAGE_KEYS.selectedPlace, { place: next, source: "device" });
        nameDevicePlace(next);
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
  }, [nameDevicePlace]);

  // Runs once: restore what was on screen last time and stop there. Fetching
  // fresh coordinates is always an explicit act via the locate button.
  useEffect(() => {
    const stored = readLocal(STORAGE_KEYS.selectedPlace, storedSchema);
    if (stored) {
      currentId.current = stored.place.id;
      setPlace(stored.place);
      setSource(stored.source);
      setResolving(false);
      // A reading stored before it could be named — the lookup failed, or the
      // app was offline — gets another chance without moving the place.
      if (stored.source === "device" && isDevicePlace(stored.place)) {
        nameDevicePlace(stored.place);
      }
    } else {
      // First visit: worth one permission prompt to answer for "here".
      requestDeviceLocation();
    }
  }, [requestDeviceLocation, nameDevicePlace]);

  const select = useCallback((next: Place) => {
    currentId.current = next.id;
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
