/** Exact handling for German employer/fund percentages. */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import {
  applyRate,
  negate,
  parseDeclaredPercentage,
  toMoney,
  toPrecise,
} from "@engine/money/money.ts";
import type { Applied, Sign } from "@engine/pipeline/helpers.ts";
import { ruleOf } from "@engine/pipeline/helpers.ts";

export function declaredPercentageOption(
  profile: EmployeeProfile,
  key: string,
): string | number | undefined {
  const value = profile.countryOptions?.[key];
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError(`${key} must be a decimal percentage`);
  }
  return value;
}

/**
 * Zusatzbeitrag is declared as the full fund rate but borne half by each side.
 * Split the exact ppb product before materialising cents; never round-trip the
 * user's decimal through Number and never truncate an odd ppb before applying.
 */
export function applyDeclaredPercentageHalfRule(
  rules: RuleSet,
  id: string,
  base: Money,
  percent: string | number,
  sign: Sign = -1,
): Applied {
  const rule = ruleOf(rules, id);
  if (rule.config.kind !== "formula") {
    throw new TypeError(`Rule ${id} must be a formula for a declared fund rate`);
  }
  const declared = parseDeclaredPercentage(percent);
  const fullPrecise = applyRate(toPrecise(base), declared.rate);
  const amount = toMoney(fullPrecise / 2n, base.currency);
  const line: CalculationLine = {
    id: rule.id,
    label: rule.label,
    amount: sign === -1 ? negate(amount) : amount,
    basis: base,
    formula: `${(base.cents / 100).toFixed(2)} × ${declared.decimal}% ÷ 2 (tasso cassa dichiarato)`,
    ruleIds: [rule.id],
    confidence: rule.verification.status,
    valueOrigin: "declared_input",
  };
  return { amount, line };
}
