"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PlaceBar } from "@/features/locations/components/place-bar";
import { isDevicePlace, useActivePlace } from "@/features/locations/hooks/use-active-place";
import { useSavedPlaces } from "@/features/locations/hooks/use-saved-places";
import { SearchCommand } from "@/features/search/components/search-command";
import { cn } from "@/lib/utils";
import { useWeatherAnswer } from "../hooks/use-weather-answer";
import { AnswerErrorState, AnswerSkeleton, NoPlaceState } from "./answer-states";
import { ConditionStats } from "./condition-stats";
import { LastUpdated } from "./last-updated";
import { StatusCard } from "./status-card";
import { toneStyle } from "./status-tone";

/**
 * The whole application, on one screen.
 *
 * Composition only: it wires the place, the answer, and the saved places
 * together and decides which of the four possible states to render. Every piece
 * of logic it needs lives in a hook or in the domain, so this file stays
 * readable as the product's outline.
 */
export function WeatherScreen() {
  const { place, permission, resolving, select, requestDeviceLocation } = useActivePlace();
  const { recent, favorites, isFavorite, toggleFavorite } = useSavedPlaces();
  const { answer, isFromCache, isLoading, isRefreshing, error, refresh } = useWeatherAnswer(place);

  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K opens search — free for anyone on a keyboard, invisible to
  // everyone else.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Explain a blocked location request, but only when the user asked for it —
  // on first load the empty state already says this.
  const notifiedDenial = useRef(false);
  useEffect(() => {
    if (permission === "denied" && place !== null && !notifiedDenial.current) {
      notifiedDenial.current = true;
      toast.error("Location access is blocked. Search for your city instead.");
    }
    if (permission === "granted") notifiedDenial.current = false;
  }, [permission, place]);

  const tone = toneStyle(answer?.snapshot.tone ?? null);
  const deviceLocation = place !== null && isDevicePlace(place);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-4 pt-4 pb-6 sm:px-6 sm:pb-8">
      {/* Background responds to the answer, so the screen reads correctly before
          a single word is processed. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70dvh] bg-gradient-to-b to-background transition-colors duration-1000",
          tone.wash,
        )}
      />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 sm:max-w-lg sm:gap-4">
        <PlaceBar
          place={place}
          isDeviceLocation={deviceLocation}
          isFavorite={place !== null && isFavorite(place)}
          onOpenSearch={() => setSearchOpen(true)}
          onToggleFavorite={() => place && toggleFavorite(place)}
          onUseDeviceLocation={requestDeviceLocation}
        />

        {resolving || (place !== null && isLoading) ? (
          <AnswerSkeleton />
        ) : place === null ? (
          <NoPlaceState
            permissionDenied={permission === "denied" || permission === "unsupported"}
            onOpenSearch={() => setSearchOpen(true)}
            onUseDeviceLocation={requestDeviceLocation}
          />
        ) : answer ? (
          <>
            <StatusCard
              status={answer.snapshot.status}
              tone={answer.snapshot.tone}
              insight={answer.insight}
              muted={isFromCache}
            />
            <ConditionStats snapshot={answer.snapshot} />
            <LastUpdated
              fetchedAt={answer.fetchedAt}
              isRefreshing={isRefreshing}
              isFromCache={isFromCache}
              onRefresh={refresh}
            />
          </>
        ) : (
          <AnswerErrorState
            message={error ?? "Please try again in a moment."}
            onRetry={refresh}
            isRetrying={isRefreshing}
          />
        )}
      </div>

      <SearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={select}
        recent={recent}
        favorites={favorites}
      />
    </main>
  );
}
