/**
 * Rule-set loading for Spain. Parsed once at module load; no fallback across
 * years, and none across communities either — an unmodelled community is a
 * refusal, not the state scale used twice.
 */

import type { RuleSet } from "@engine/model/rule.ts";
import { parseRuleSet } from "@engine/rules/schema.ts";
import raw2026 from "./2026.json";

const SETS: ReadonlyMap<number, RuleSet> = new Map([[2026, parseRuleSet(raw2026)]]);

export const SUPPORTED_TAX_YEARS: readonly number[] = [...SETS.keys()].sort();

export function loadSpanishRules(taxYear: number): RuleSet | undefined {
  return SETS.get(taxYear);
}
