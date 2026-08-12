/**
 * Canonical German contribution bases.
 *
 * The current product accepts one stable annual salary and no separately
 * declared one-off remuneration. That makes annual gross the recurring-pay
 * input, but it does not make raw gross the legal base: pension, unemployment,
 * U1 and U2 all stop at the pension BBG; health and care stop at their own BBG.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import { min, moneyFromDecimal } from "@engine/money/money.ts";
import { ruleOf } from "@engine/pipeline/helpers.ts";

export function stableAnnualRemuneration(profile: EmployeeProfile): Money {
  return profile.grossAnnual;
}

export function pensionInsuranceBase(profile: EmployeeProfile, rules: RuleSet): Money {
  return cappedBase(profile, rules, "DE.RV.EMPLOYEE");
}

export function healthAndCareBase(profile: EmployeeProfile, rules: RuleSet): Money {
  return cappedBase(profile, rules, "DE.KV.EMPLOYEE.BASE");
}

/**
 * AAG U1/U2 base: recurring pension-insurable remuneration, excluding one-off
 * payments. The input model currently represents recurring remuneration only.
 */
export function levyBase(profile: EmployeeProfile, rules: RuleSet): Money {
  return pensionInsuranceBase(profile, rules);
}

function cappedBase(profile: EmployeeProfile, rules: RuleSet, ruleId: string): Money {
  const config = ruleOf(rules, ruleId).config;
  if (config.kind !== "capped_rate") {
    throw new TypeError(`${ruleId} must be a capped_rate to resolve its contribution base`);
  }
  return min(
    stableAnnualRemuneration(profile),
    moneyFromDecimal(config.ceiling, profile.grossAnnual.currency),
  );
}
