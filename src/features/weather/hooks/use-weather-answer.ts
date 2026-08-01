"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { REFRESH_INTERVAL_MS, WEATHER_CACHE_TTL_SECONDS } from "@/config/app";
import { placeSchema, type Place } from "@/features/locations/domain/place";
import { apiGet, ApiError } from "@/lib/api-client";
import { readLocal, STORAGE_KEYS, writeLocal } from "@/lib/local-store";
import { weatherAnswerSchema, type WeatherAnswer } from "../domain/answer";

/**
 * The answer for a place, kept current.
 *
 * Refreshes every 60 seconds and again whenever the tab regains focus — someone
 * who put their phone away and came back to the door needs the answer as of
 * now, not as of five minutes ago.
 *
 * Every successful answer is mirrored to localStorage. If a later fetch fails,
 * that copy is shown with its real age instead of an error, because a
 * two-minute-old answer is still useful and an error message is not.
 */

const cachedAnswerSchema = z.object({
  place: placeSchema,
  answer: weatherAnswerSchema,
});

type CachedAnswer = z.infer<typeof cachedAnswerSchema>;

export interface WeatherAnswerState {
  answer: WeatherAnswer | null;
  /** True when `answer` came from localStorage after a failed fetch. */
  isFromCache: boolean;
  /** First load for this place, with nothing to show yet. */
  isLoading: boolean;
  /** A background refresh is in flight; existing content stays on screen. */
  isRefreshing: boolean;
  /** Set only when there is nothing at all to show. */
  error: string | null;
  refresh: () => void;
}

function fetchAnswer(place: Place, signal: AbortSignal): Promise<WeatherAnswer> {
  const query = new URLSearchParams({
    lat: String(place.latitude),
    lon: String(place.longitude),
  });
  return apiGet(`/api/weather?${query}`, weatherAnswerSchema, signal);
}

export function useWeatherAnswer(place: Place | null): WeatherAnswerState {
  const query = useQuery({
    queryKey: ["weather", place?.id],
    queryFn: ({ signal }) => fetchAnswer(place as Place, signal),
    enabled: place !== null,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // Matches the server cache window: refetching sooner cannot return anything
    // new, so a remount within it should reuse what we have.
    staleTime: WEATHER_CACHE_TTL_SECONDS * 1000,
    retry: 1,
  });

  const [cached, setCached] = useState<CachedAnswer | null>(null);
  const hydrated = useRef(false);

  // Read the offline copy once, after mount, so the server-rendered markup and
  // the first client render agree.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setCached(readLocal(STORAGE_KEYS.lastAnswer, cachedAnswerSchema));
  }, []);

  useEffect(() => {
    if (!query.data || !place) return;
    const entry: CachedAnswer = { place, answer: query.data };
    writeLocal(STORAGE_KEYS.lastAnswer, entry);
    setCached(entry);
  }, [query.data, place]);

  return useMemo(() => {
    if (query.data) {
      return {
        answer: query.data,
        isFromCache: false,
        isLoading: false,
        isRefreshing: query.isFetching,
        error: null,
        refresh: () => void query.refetch(),
      };
    }

    // Nothing live. The stored answer only stands in for the place it was
    // taken at — showing Kochi's rain while the user asks about Dubai would be
    // worse than showing nothing.
    const usableCache = cached && place && cached.place.id === place.id ? cached.answer : null;

    return {
      answer: usableCache,
      isFromCache: usableCache !== null,
      isLoading: query.isPending && place !== null && usableCache === null,
      isRefreshing: query.isFetching,
      error: usableCache
        ? null
        : query.error instanceof ApiError
          ? query.error.message
          : query.error
            ? "Could not load conditions."
            : null,
      refresh: () => void query.refetch(),
    };
  }, [query, cached, place]);
}
