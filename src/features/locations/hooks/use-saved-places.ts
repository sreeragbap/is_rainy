"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { placeSchema, sameKey, type Place } from "../domain/place";

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

export interface ToggleFavoriteOptions {
  /**
   * Have the server name the point before saving it. Set for a device reading,
   * which has coordinates but no label worth keeping.
   */
  resolveName?: boolean;
}

export interface SavedPlacesState {
  recent: Place[];
  favorites: Place[];
  isFavorite: (place: Place) => boolean;
  toggleFavorite: (place: Place, options?: ToggleFavoriteOptions) => void;
  /** A toggle is in flight — naming a place adds a round trip to it. */
  isSaving: boolean;
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
    mutationFn: ({ place, resolveName }: { place: Place } & ToggleFavoriteOptions) =>
      apiPost(
        "/api/locations/favorites",
        resolveName ? { ...place, resolveName } : place,
        toggleResponseSchema,
      ),

    onMutate: async ({ place }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<SavedPlaces>(QUERY_KEY);

      queryClient.setQueryData<SavedPlaces>(QUERY_KEY, (current) => {
        const base = current ?? EMPTY;
        const key = sameKey(place);
        const exists = base.favorites.some((candidate) => sameKey(candidate) === key);
        return {
          ...base,
          favorites: exists
            ? base.favorites.filter((candidate) => sameKey(candidate) !== key)
            : [...base.favorites, place],
        };
      });

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast.error(
        error instanceof ApiError ? error.message : "Could not save that. Please try again.",
      );
    },

    // Recents can change too — favouriting upserts the place — so refetch both.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const isFavorite = useCallback(
    (place: Place) => {
      const key = sameKey(place);
      return saved.favorites.some((candidate) => sameKey(candidate) === key);
    },
    [saved.favorites],
  );

  const { mutate } = mutation;
  const toggleFavorite = useCallback(
    (place: Place, options?: ToggleFavoriteOptions) => mutate({ place, ...options }),
    [mutate],
  );

  return {
    recent: saved.recent,
    favorites: saved.favorites,
    isFavorite,
    toggleFavorite,
    isSaving: mutation.isPending,
    isLoading: isPending,
  };
}
