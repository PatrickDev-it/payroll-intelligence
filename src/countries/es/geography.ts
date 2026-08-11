/**
 * The 15 autonomous communities of the common regime, derived FROM THE RULE SET
 * exactly as the Italian regions are: a community cannot appear in the form
 * without a scale behind it, and a scale cannot be added without becoming
 * selectable.
 *
 * Navarra and País Vasco are deliberately absent. They are `foral` territories:
 * they levy their own IRPF under their own laws, not a regional half of the
 * state tax, so offering them here with a common-regime scale would not be an
 * approximation — it would be the wrong tax. Ceuta and Melilla, with their 60%
 * reduction, are likewise out of scope.
 */

import type { ConfidenceTier } from "@engine/model/confidence.ts";
import { AUTONOMIC_SCALE_PREFIX } from "./profile.ts";
import { loadSpanishRules } from "./rules/index.ts";

export type Community = {
  readonly key: string;
  readonly label: string;
  readonly ruleId: string;
  readonly confidence: ConfidenceTier;
};

function communitiesFromRules(): readonly Community[] {
  const rules = loadSpanishRules(2026);
  if (!rules) return [];

  return Object.values(rules.rules)
    .filter((rule) => rule.id.startsWith(AUTONOMIC_SCALE_PREFIX))
    .map((rule) => ({
      key: rule.id.slice(AUTONOMIC_SCALE_PREFIX.length),
      // "Escala autonómica del IRPF — Cataluña" -> "Cataluña"
      label: rule.label.split("—").at(-1)?.trim() ?? rule.id,
      ruleId: rule.id,
      confidence: rule.verification.status,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export const COMMUNITIES: readonly Community[] = communitiesFromRules();

export function isKnownCommunity(key: string): boolean {
  return COMMUNITIES.some((community) => community.key === key);
}

export function communityLabel(key: string): string {
  return COMMUNITIES.find((community) => community.key === key)?.label ?? key;
}
