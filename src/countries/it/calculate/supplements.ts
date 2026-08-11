/**
 * The two cash supplements, which are the part of Italian payroll most often
 * modelled wrongly.
 *
 * They are paid THROUGH payroll and are not reductions of tax: at low incomes
 * they can exceed the withholdings entirely, so `net <= gross` is not an
 * invariant of this system. Treating them as negative tax gives the right net
 * and the wrong breakdown — and the breakdown is the product.
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import { clampAtZero, compare, min, moneyFromDecimal, subtract, zero } from "@engine/money/money.ts";
import { MINUS, amt } from "@engine/primitives/format.ts";
import { derivedLine, formulaParam, ruleOf } from "@engine/pipeline/helpers.ts";

/**
 * Trattamento integrativo — art. 1 D.L. 3/2020.
 *
 * Relational by law, which is why it lives in the pipeline rather than in a
 * primitive: below the lower threshold it is due only if gross IRPEF exceeds the
 * art. 13 employment credit (the `capienza` test); between the thresholds the
 * amount IS the excess of total credits over gross IRPEF, capped. The cap and
 * both thresholds still come from the rule.
 */
export function integrativeTreatment(
  rules: RuleSet,
  totalIncome: Money,
  irpefGross: Money,
  employmentCredit: Money,
  totalTaxCredits: Money,
): CalculationLine | undefined {
  const rule = ruleOf(rules, "IT.PAYROLL.TRATTAMENTO_INTEGRATIVO");
  const currency = totalIncome.currency;
  const cap = moneyFromDecimal(formulaParam(rule, "amount"), currency);
  const lower = moneyFromDecimal(formulaParam(rule, "lowerThreshold"), currency);
  const upper = moneyFromDecimal(formulaParam(rule, "upperThreshold"), currency);

  if (compare(totalIncome, upper) > 0) return undefined;

  let amount: Money;
  let formula: string;

  if (compare(totalIncome, lower) <= 0) {
    const hasCapienza = compare(irpefGross, employmentCredit) > 0;
    amount = hasCapienza ? cap : zero(currency);
    formula = hasCapienza
      ? `${amt(cap)} \u2014 IRPEF lorda ${amt(irpefGross)} > detrazione art. 13 ${amt(employmentCredit)}`
      : `IRPEF lorda ${amt(irpefGross)} \u2264 detrazione art. 13 \u2192 0,00`;
  } else {
    const excess = clampAtZero(subtract(totalTaxCredits, irpefGross));
    amount = min(cap, excess);
    formula = `min(${amt(cap)}; ${amt(totalTaxCredits)} detrazioni ${MINUS} ${amt(irpefGross)} IRPEF lorda)`;
  }

  if (amount.cents === 0) return undefined;

  return derivedLine(
    rule.id,
    rule.label,
    amount,
    formula,
    [rule.id],
    rule.verification.status,
  );
}
