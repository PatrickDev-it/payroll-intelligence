/**
 * Rule-set loading for France. Parsed once at module load; no fallback across
 * years — and in France that matters more than elsewhere, because the 2026
 * employer side is not the 2025 one with different numbers, it is a different
 * mechanism.
 */

import type { RuleSet } from "@engine/model/rule.ts";
import { parseRuleSet } from "@engine/rules/schema.ts";
import raw2026 from "./2026.json";

const SETS: ReadonlyMap<number, RuleSet> = new Map([[2026, parseRuleSet(raw2026)]]);

export const SUPPORTED_TAX_YEARS: readonly number[] = [...SETS.keys()].sort();

export function loadFrenchRules(taxYear: number): RuleSet | undefined {
  return SETS.get(taxYear);
}
