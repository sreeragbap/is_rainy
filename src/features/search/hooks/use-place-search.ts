"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { placeSchema, type Place } from "@/features/locations/domain/place";
import { apiGet } from "@/lib/api-client";
import { MIN_QUERY_LENGTH } from "../application/search-places";

/**
 * Debounced city search.
 *
 * 250ms is short enough to feel immediate while collapsing a typed word into
 * roughly one request. Results stay cached per query, so backspacing is free.
 */

const DEBOUNCE_MS = 250;

const responseSchema = z.object({ results: z.array(placeSchema) });

export interface PlaceSearchState {
  results: Place[];
  isSearching: boolean;
  /** True once a query has run and matched nothing. */
  isEmpty: boolean;
  error: string | null;
}

export function usePlaceSearch(query: string): PlaceSearchState {
  const trimmed = query.trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const enabled = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, error } = useQuery({
    queryKey: ["place-search", debounced],
    queryFn: ({ signal }) =>
      apiGet(`/api/locations/search?q=${encodeURIComponent(debounced)}`, responseSchema, signal),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // While the debounce timer is still pending, report as searching so the list
  // never flashes "no matches" for a query we have not run yet.
  const settling = trimmed !== debounced && trimmed.length >= MIN_QUERY_LENGTH;

  return {
    results: data?.results ?? [],
    isSearching: settling || (enabled && isFetching),
    isEmpty: enabled && !isFetching && !settling && (data?.results.length ?? 0) === 0,
    error: error ? "Search is unavailable right now." : null,
  };
}
