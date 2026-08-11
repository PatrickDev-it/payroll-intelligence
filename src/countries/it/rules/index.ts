/**
 * Rule-set loading for Italy.
 *
 * Sets are parsed once at module load, so a malformed rule file fails at
 * startup rather than on the first calculation that happens to touch it.
 * There is no fallback across years: 2025 is not "2026 minus the changes",
 * it is a rule set that does not exist here yet.
 */

import type { RuleSet } from "@engine/model/rule.ts";
import raw2026 from "./2026.json";
import { parseRuleSet } from "@engine/rules/schema.ts";

const SETS: ReadonlyMap<number, RuleSet> = new Map([[2026, parseRuleSet(raw2026)]]);

export const SUPPORTED_TAX_YEARS: readonly number[] = [...SETS.keys()].sort();

export function loadItalianRules(taxYear: number): RuleSet | undefined {
  return SETS.get(taxYear);
}

export { RuleSetValidationError, parseRuleSet, ruleSetSchema } from "@engine/rules/schema.ts";
