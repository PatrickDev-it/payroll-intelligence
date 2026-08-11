/**
 * Rule-set loading for Germany. Parsed once at module load, so a malformed rule
 * file fails at startup rather than on the first calculation that touches it.
 * There is no fallback across years.
 */

import type { RuleSet } from "@engine/model/rule.ts";
import { parseRuleSet } from "@engine/rules/schema.ts";
import raw2026 from "./2026.json";

const SETS: ReadonlyMap<number, RuleSet> = new Map([[2026, parseRuleSet(raw2026)]]);

export const SUPPORTED_TAX_YEARS: readonly number[] = [...SETS.keys()].sort();

export function loadGermanRules(taxYear: number): RuleSet | undefined {
  return SETS.get(taxYear);
}
