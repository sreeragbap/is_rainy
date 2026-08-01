"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { placeSchema, type Place } from "../domain/place";

/**
 * A client's remembered places.
 *
 * Favouriting is optimistic — the star fills the moment it is tapped — and
 * rolls back with an explanation if the server disagrees. Anything a user taps
 * should respond immediately; anything that then fails should say so.
 */

const savedPlacesSchema = z.object({
  recent: z.array(placeSchema),
  favorites: z.array(placeSchema),
  degraded: z.boolean(),
});

type SavedPlaces = z.infer<typeof savedPlacesSchema>;

const toggleResponseSchema = z.object({
  favorited: z.boolean(),
  place: placeSchema,
});

const QUERY_KEY = ["saved-places"] as const;

const EMPTY: SavedPlaces = { recent: [], favorites: [], degraded: false };

export interface SavedPlacesState {
  recent: Place[];
  favorites: Place[];
  isFavorite: (place: Place) => boolean;
  toggleFavorite: (place: Place) => void;
  isLoading: boolean;
}

export function useSavedPlaces(): SavedPlacesState {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) => apiGet("/api/locations", savedPlacesSchema, signal),
    staleTime: 60_000,
    retry: false,
  });

  const saved = data ?? EMPTY;

  const mutation = useMutation({
    mutationFn: (place: Place) => apiPost("/api/locations/favorites", place, toggleResponseSchema),

    onMutate: async (place) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<SavedPlaces>(QUERY_KEY);

      queryClient.setQueryData<SavedPlaces>(QUERY_KEY, (current) => {
        const base = current ?? EMPTY;
        const exists = base.favorites.some((candidate) => candidate.id === place.id);
        return {
          ...base,
          favorites: exists
            ? base.favorites.filter((candidate) => candidate.id !== place.id)
            : [...base.favorites, place],
        };
      });

      return { previous };
    },

    onError: (error, _place, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast.error(
        error instanceof ApiError ? error.message : "Could not save that. Please try again.",
      );
    },

    // Recents can change too — favouriting upserts the place — so refetch both.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const isFavorite = useCallback(
    (place: Place) => saved.favorites.some((candidate) => candidate.id === place.id),
    [saved.favorites],
  );

  return {
    recent: saved.recent,
    favorites: saved.favorites,
    isFavorite,
    toggleFavorite: mutation.mutate,
    isLoading: isPending,
  };
}
