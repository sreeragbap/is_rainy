"use client";

import { InsightLine } from "@/features/insight/components/insight-line";
import type { Insight } from "@/features/insight/domain/types";
import { ShimmerOverlay } from "@/components/ui/shimmer-overlay";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { statusCopy } from "../domain/status-copy";
import type { RainStatus, StatusTone } from "../domain/types";
import { toneStyle } from "./status-tone";

/**
 * The hero. The answer, and nothing else.
 *
 * Deliberately the largest thing on screen: the whole product is the promise
 * that this can be read in under a second, from a distance, without focusing.
 */
export function StatusCard({
  status,
  tone,
  insight,
  muted = false,
  shimmer = false,
}: {
  status: RainStatus;
  tone: StatusTone;
  insight: Insight;
  /** Dimmed while showing an answer we know is no longer current. */
  muted?: boolean;
  /** A light sweep across the card while fresher data is being fetched. */
  shimmer?: boolean;
}) {
  const copy = statusCopy(status);
  const styles = toneStyle(tone);

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-[2rem] border bg-card/55 px-5 py-8 text-center shadow-xl shadow-black/[0.04] backdrop-blur-xl transition-opacity duration-500 sm:gap-6 sm:px-6 sm:py-12",
        styles.border,
        muted && "opacity-70",
      )}
    >
      {/* Halo behind the glyph — depth, without decoration competing for attention. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-[70%] rounded-full opacity-50 blur-3xl transition-colors duration-1000",
          styles.blob,
        )}
      />

      <ShimmerOverlay active={shimmer} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center gap-5"
        >
          <span className="text-6xl leading-none sm:text-7xl" role="img" aria-label={copy.label}>
            {copy.glyph}
          </span>

          <h1 className="max-w-[18ch] text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {copy.headline}
          </h1>
        </motion.div>
      </AnimatePresence>

      <InsightLine insight={insight} />
    </section>
  );
}
