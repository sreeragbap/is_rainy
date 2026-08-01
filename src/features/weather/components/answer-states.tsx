"use client";

import { CloudOffIcon, MapPinIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Everything the screen shows when it cannot show the answer.
 *
 * Each state is a full-height card matching the hero's shape, so the layout
 * never jumps as the app moves from loading to answered — the answer appears
 * where the skeleton was.
 */

const CARD =
  "bg-card/55 flex flex-1 flex-col items-center justify-center gap-6 rounded-[2rem] border px-6 py-12 text-center shadow-xl shadow-black/[0.04] backdrop-blur-xl";

/** Shown only on a genuine first load, where there is nothing cached to show. */
export function AnswerSkeleton() {
  return (
    <section className={CARD} aria-busy="true" aria-label="Loading conditions">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-5 w-48 max-w-full" />
    </section>
  );
}

/** No coordinates yet: geolocation was declined, or is unavailable. */
export function NoPlaceState({
  permissionDenied,
  onOpenSearch,
  onUseDeviceLocation,
}: {
  permissionDenied: boolean;
  onOpenSearch: () => void;
  onUseDeviceLocation: () => void;
}) {
  return (
    <section className={CARD}>
      <MapPinIcon className="size-10 text-muted-foreground" aria-hidden />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Where are you?</h1>
        <p className="max-w-sm text-balance text-muted-foreground">
          {permissionDenied
            ? "Location access is blocked, so search for your city instead."
            : "Share your location or search for a city, and we'll tell you if it's raining."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onOpenSearch}>
          <SearchIcon aria-hidden />
          Search a city
        </Button>
        {!permissionDenied && (
          <Button variant="outline" onClick={onUseDeviceLocation}>
            <MapPinIcon aria-hidden />
            Use my location
          </Button>
        )}
      </div>
    </section>
  );
}

/** A failed fetch with no cached answer to fall back on. */
export function AnswerErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <section className={CARD} role="alert">
      <CloudOffIcon className="size-10 text-muted-foreground" aria-hidden />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          We couldn&apos;t check just now.
        </h1>
        <p className="max-w-sm text-balance text-muted-foreground">{message}</p>
      </div>

      <Button onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Trying…" : "Try again"}
      </Button>
    </section>
  );
}
