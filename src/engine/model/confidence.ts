/**
 * Confidence tiers, and the one rule that governs them.
 *
 * A tier is earned per RULE, against the bar in docs/00-methodology.md §5.
 * A result carries the MINIMUM tier of the rules that produced it — never an
 * average, never a majority, never rounded up. One experimental input makes the
 * whole output experimental, because a reader cannot tell which line was weak.
 */

export const CONFIDENCE_TIERS = ["experimental", "supported", "verified"] as const;

export type ConfidenceTier = (typeof CONFIDENCE_TIERS)[number];

/** Ascending: a lower rank is a weaker claim. */
const RANK: Record<ConfidenceTier, number> = {
  experimental: 0,
  supported: 1,
  verified: 2,
};

/**
 * The propagation rule. An empty list is `experimental`, not `verified`:
 * a result produced by no stated rule has no provenance at all.
 */
export function lowestConfidence(tiers: readonly ConfidenceTier[]): ConfidenceTier {
  let lowest: ConfidenceTier = "verified";
  if (tiers.length === 0) return "experimental";
  for (const tier of tiers) {
    if (RANK[tier] < RANK[lowest]) lowest = tier;
  }
  return lowest;
}

export function isAtLeast(tier: ConfidenceTier, floor: ConfidenceTier): boolean {
  return RANK[tier] >= RANK[floor];
}

/** The public wording. Never soften "experimental" in the UI. */
export const CONFIDENCE_LABEL: Record<ConfidenceTier, string> = {
  verified: "Verified against official sources",
  supported: "Implemented from authoritative documentation",
  experimental: "Experimental — indicative only",
};

/**
 * The same claim in one word, for inline use in a dense row where the full
 * sentence would push the amount off a narrow screen. Shortened, never softened:
 * "experimental" still reads as experimental.
 */
export const CONFIDENCE_SHORT: Record<ConfidenceTier, string> = {
  verified: "Verificato",
  supported: "Documentato",
  experimental: "Sperimentale",
};
