"use client";

import { ChevronsUpDownIcon, LocateFixedIcon, MapPinIcon, StarIcon } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPlace, type Place } from "../domain/place";

/**
 * The one row of chrome above the answer: where we are, and how to change it.
 *
 * Kept to a handful of icon controls. Anything more would compete with the
 * hero, and this app has exactly one screen to get right.
 */
export function PlaceBar({
  place,
  isDeviceLocation,
  isFavorite,
  isSavingFavorite = false,
  onOpenSearch,
  onToggleFavorite,
  onUseDeviceLocation,
}: {
  place: Place | null;
  isDeviceLocation: boolean;
  isFavorite: boolean;
  /** Naming a device reading takes a round trip; the star waits for it. */
  isSavingFavorite?: boolean;
  onOpenSearch: () => void;
  onToggleFavorite: () => void;
  onUseDeviceLocation: () => void;
}) {
  const label = place ? (isDeviceLocation ? "Your location" : formatPlace(place)) : "Choose a city";

  return (
    <header className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border bg-card/55 px-4 text-left text-sm backdrop-blur-xl transition-colors hover:bg-card/80 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <MapPinIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {/* A device reading is saveable too: the place it sits in is named on the
          way to the favourites list, so "here" becomes somewhere. */}
      {place && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleFavorite}
          disabled={isSavingFavorite}
          aria-pressed={isFavorite}
          aria-label={
            isFavorite
              ? `Remove ${isDeviceLocation ? "your location" : place.name} from favourites`
              : `Add ${isDeviceLocation ? "your location" : place.name} to favourites`
          }
        >
          <StarIcon
            className={cn(
              "size-4 transition-colors",
              isFavorite && "fill-status-clear text-status-clear",
            )}
            aria-hidden
          />
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={onUseDeviceLocation}
        aria-label="Use my current location"
      >
        <LocateFixedIcon className="size-4" aria-hidden />
      </Button>

      <ThemeToggle />
    </header>
  );
}
