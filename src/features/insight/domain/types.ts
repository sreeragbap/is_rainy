/**
 * The one sentence of advice shown under the answer.
 *
 * Modelled as data rather than a string so the UI can emphasise urgency without
 * re-deriving it, and so the rules stay testable in isolation.
 */

export type InsightUrgency = "calm" | "caution" | "warning";

export interface Insight {
  /** The sentence. One line, imperative where there is something to do. */
  message: string;
  urgency: InsightUrgency;
  /** Stable identifier for the rule that fired — useful in tests and logs. */
  rule: string;
}
