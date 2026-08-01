"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Insight } from "../domain/types";

/**
 * The sentence of advice.
 *
 * Sized just below the headline: read second, but read. Urgency changes weight
 * and colour rather than adding an icon or a badge — the words are already the
 * warning.
 */

const URGENCY_CLASSES: Record<Insight["urgency"], string> = {
  calm: "text-muted-foreground",
  caution: "text-foreground/80",
  warning: "text-destructive font-medium",
};

export function InsightLine({ insight }: { insight: Insight }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={insight.message}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn(
          "max-w-sm text-lg leading-snug text-balance sm:text-xl",
          URGENCY_CLASSES[insight.urgency],
        )}
      >
        {insight.message}
      </motion.p>
    </AnimatePresence>
  );
}
