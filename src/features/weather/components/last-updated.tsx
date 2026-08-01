"use client";

import { useEffect, useState } from "react";
import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * When the answer was taken, in words.
 *
 * The footnote of the page, but the thing that makes the rest trustworthy: an
 * answer with no age is impossible to judge. The label re-renders on a timer so
 * it never quietly claims to be fresher than it is.
 */

const TICK_MS = 15_000;

function describeAge(fetchedAt: string, now: number): string {
  const elapsedSeconds = Math.max(0, Math.round((now - new Date(fetchedAt).getTime()) / 1000));

  if (elapsedSeconds < 45) return "just now";
  const minutes = Math.round(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return "over a day ago";
}

export function LastUpdated({
  fetchedAt,
  isRefreshing,
  isFromCache,
  onRefresh,
}: {
  fetchedAt: string;
  isRefreshing: boolean;
  isFromCache: boolean;
  onRefresh: () => void;
}) {
  // Rendered as `null` on the server and on the first client paint: relative
  // time depends on the current clock, which the two do not share.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
    >
      {isFromCache ? (
        <CloudOffIcon className="size-3" aria-hidden />
      ) : (
        <RefreshCwIcon className={cn("size-3", isRefreshing && "animate-spin")} aria-hidden />
      )}
      <span>
        {isFromCache ? "Offline — last known" : "Updated"}{" "}
        {now === null ? "" : describeAge(fetchedAt, now)}
      </span>
    </button>
  );
}
