"use client";

import { AnimatePresence, motion } from "motion/react";

/**
 * A sweep of light across the parent card while fresher data is on its way —
 * activity feedback that never hides what is already on screen.
 *
 * The parent must be `relative`; the overlay inherits its rounding and clips
 * the sweep to it. Mounting fades in and out so even a brief activation reads
 * as a deliberate pulse rather than a flicker.
 */
export function ShimmerOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-foreground/12 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
