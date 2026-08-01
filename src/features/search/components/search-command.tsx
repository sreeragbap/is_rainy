"use client";

import { useEffect, useState } from "react";
import { ClockIcon, Loader2Icon, MapPinIcon, StarIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatPlace, type Place } from "@/features/locations/domain/place";
import { usePlaceSearch } from "../hooks/use-place-search";

/**
 * City search.
 *
 * Opens onto the user's own places rather than an empty box: reopening the app
 * in a building you were in yesterday should take one tap, not a retyped name.
 * Fresh search results replace that list as soon as there is a query.
 */

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (place: Place) => void;
  recent: Place[];
  favorites: Place[];
}

export function SearchCommand({
  open,
  onOpenChange,
  onSelect,
  recent,
  favorites,
}: SearchCommandProps) {
  const [query, setQuery] = useState("");
  const { results, isSearching, isEmpty, error } = usePlaceSearch(query);

  // A reopened palette should not still hold the last search.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const searching = query.trim().length > 0;

  const choose = (place: Place) => {
    onSelect(place);
    onOpenChange(false);
  };

  // Favourites a user already has are not repeated in the recents list.
  const favoriteIds = new Set(favorites.map((place) => place.id));
  const recentOnly = recent.filter((place) => !favoriteIds.has(place.id));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search for a city"
      description="Find any city to check whether it is raining there."
    >
      <CommandInput placeholder="Search any city…" value={query} onValueChange={setQuery} />

      <CommandList>
        {searching ? (
          <>
            {isSearching && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                Searching…
              </div>
            )}

            {error && <CommandEmpty>{error}</CommandEmpty>}
            {isEmpty && !error && <CommandEmpty>No cities match “{query.trim()}”.</CommandEmpty>}

            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((place) => (
                  <PlaceItem key={place.id} place={place} onSelect={choose} icon={MapPinIcon} />
                ))}
              </CommandGroup>
            )}
          </>
        ) : (
          <>
            {favorites.length > 0 && (
              <CommandGroup heading="Favourites">
                {favorites.map((place) => (
                  <PlaceItem key={place.id} place={place} onSelect={choose} icon={StarIcon} />
                ))}
              </CommandGroup>
            )}

            {recentOnly.length > 0 && (
              <CommandGroup heading="Recent">
                {recentOnly.map((place) => (
                  <PlaceItem key={place.id} place={place} onSelect={choose} icon={ClockIcon} />
                ))}
              </CommandGroup>
            )}

            {favorites.length === 0 && recentOnly.length === 0 && (
              <CommandEmpty>Type a city name to begin.</CommandEmpty>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function PlaceItem({
  place,
  onSelect,
  icon: Icon,
}: {
  place: Place;
  onSelect: (place: Place) => void;
  icon: typeof MapPinIcon;
}) {
  return (
    <CommandItem
      // cmdk matches on `value`; the full label keeps keyboard filtering sane
      // even though the server does the real searching.
      value={`${place.id}-${place.name}`}
      onSelect={() => onSelect(place)}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{place.name}</span>
        {(place.admin || place.country) && (
          <span className="text-muted-foreground">
            {" · "}
            {[place.admin, place.country].filter(Boolean).join(", ")}
          </span>
        )}
      </span>
      <span className="sr-only">{formatPlace(place)}</span>
    </CommandItem>
  );
}
