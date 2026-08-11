/**
 * The Spanish contribution base, in one place because both sides of the payslip
 * must use exactly the same number.
 *
 * Contributions are not charged on salary. They are charged on a monthly base
 * clamped between the professional group's minimum and a single maximum of
 * €5.101,20 — so above €61.214,40 a year ordinary contributions stop growing
 * entirely, and it is the `cotización de solidaridad` that takes over.
 *
 * Annualising the monthly base is exact for a flat salary and approximate when
 * a `paga extraordinaria` pushes one month over the cap on its own. Stated in
 * docs/06-simplifications.md rather than hidden.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import { fromCents, max, min, moneyFromDecimal } from "@engine/money/money.ts";
import { formulaParam, ruleOf } from "@engine/pipeline/helpers.ts";
import { applyPrimitive } from "@engine/primitives/apply.ts";
import { cotizacionGroupOf } from "./profile.ts";

export function contributionBase(profile: EmployeeProfile, rules: RuleSet): Money {
  const currency = profile.grossAnnual.currency;
  const rule = ruleOf(rules, "ES.SS.BASE");
  const months = Number(formulaParam(rule, "months"));

  const maxMonthly = moneyFromDecimal(formulaParam(rule, "maxMonthly"), currency);
  const minMonthly = applyPrimitive(ruleOf(rules, "ES.SS.BASE.MINIMA").config, {
    base: profile.grossAnnual,
    key: cotizacionGroupOf(profile),
  }).amount;

  const annualMin = fromCents(minMonthly.cents * months, currency);
  const annualMax = fromCents(maxMonthly.cents * months, currency);
  return min(max(profile.grossAnnual, annualMin), annualMax);
}
