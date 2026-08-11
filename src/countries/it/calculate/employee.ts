/**
 * The Italian employee pipeline. Order is load-bearing; see
 * docs/countries/IT/README.md ("Three ordering rules that are easy to get wrong").
 *
 *   1. contributions come off BEFORE IRPEF (art. 51 c. 2 lett. a TUIR)
 *   2. addizionali apply to the TAXABLE BASE, not to the tax
 *   3. credits clamp the tax at zero; the cash supplements are added AFTER and
 *      are not negative tax — modelling them as such gives the right net and
 *      the wrong breakdown, and the breakdown is the product
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { add, clampAtZero, negate, subtract, sum, zero } from "@engine/money/money.ts";
import { MINUS, amt } from "@engine/primitives/format.ts";
import {
  DEFAULT_MUNICIPALITY,
  DEFAULT_REGION,
  municipalityRuleId,
  regionRuleId,
} from "../geography.ts";
import type { EmployeeComputation } from "@engine/pipeline/assemble.ts";
import { applyRule, derivedLine } from "@engine/pipeline/helpers.ts";
import { integrativeTreatment } from "./supplements.ts";
import { italianContributionRuleIds } from "../contributions.ts";


export type { EmployeeComputation };

export function computeEmployee(profile: EmployeeProfile, rules: RuleSet): EmployeeComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  // ① Employee social security — capped at the massimale, plus 1% above the
  //    first pensionable band. Deducted before anything touches the tax base.
  const contributionRules = italianContributionRuleIds(profile);
  const ivs = applyRule(rules, contributionRules.employeeIvs, gross);
  const extra = applyRule(rules, contributionRules.employeeAdditionalIvs, gross);
  const fis = applyRule(rules, contributionRules.employeeFis, gross);
  const totalContributions = sum([ivs.amount, extra.amount, fis.amount], currency);
  const socialSecurity = [ivs.line, ...(extra.amount.cents > 0 ? [extra.line] : []), fis.line];

  // ② Taxable income. `reddito complessivo` and `reddito imponibile` coincide
  //    for a single-income profile but are kept distinct in the model.
  const taxableIncome = subtract(gross, totalContributions);
  const totalIncome = taxableIncome;

  // ③ Gross IRPEF.
  const irpefGross = applyRule(rules, "IT.IRPEF.BRACKETS", taxableIncome);

  // ④ Credits against the tax. They reduce it to zero, never below.
  const employmentCredit = applyRule(rules, "IT.IRPEF.DETRAZIONE.LAVORO", totalIncome, { sign: 1 });
  const bonus65 = applyRule(rules, "IT.IRPEF.DETRAZIONE.BONUS65", totalIncome, { sign: 1 });
  const cuneo = applyRule(rules, "IT.IRPEF.ULTERIORE_DETRAZIONE", totalIncome, { sign: 1 });
  const creditAmounts = [employmentCredit.amount, bonus65.amount, cuneo.amount];
  const totalTaxCredits = sum(creditAmounts, currency);

  // ⑤ Net IRPEF. Keep cent precision: art. 11(4) TUIR governs foreign-tax
  //    credits, not a payroll rounding rule.
  const irpefNet = clampAtZero(subtract(irpefGross.amount, totalTaxCredits));

  const irpefChildren: CalculationLine[] = [irpefGross.line];
  for (const credit of [employmentCredit, bonus65, cuneo]) {
    if (credit.amount.cents > 0) irpefChildren.push(credit.line);
  }
  const irpefLine = derivedLine(
    "IT.IRPEF",
    "IRPEF netta",
    negate(irpefNet),
    `${amt(irpefGross.amount)} lorda ${MINUS} ${amt(totalTaxCredits)} di detrazioni`,
    ["IT.IRPEF.BRACKETS", "IT.IRPEF.DETRAZIONE.LAVORO"],
    irpefGross.line.confidence,
    irpefChildren,
  );

  // ⑥ Local surtaxes — on the taxable base, never on the tax. The rule id is
  //    built from the profile, so all 21 regions and every modelled comune go
  //    through the same code path; the adapter has already refused an unknown one.
  const regionalRuleId = regionRuleId(profile.region ?? DEFAULT_REGION);
  const municipalRule = municipalityRuleId(profile.municipality ?? DEFAULT_MUNICIPALITY);
  const regional =
    irpefNet.cents > 0
      ? applyRule(rules, regionalRuleId, taxableIncome)
      : zeroAppliedRule(rules, regionalRuleId, taxableIncome);
  const municipal =
    irpefNet.cents > 0
      ? applyRule(rules, municipalRule, taxableIncome)
      : zeroAppliedRule(rules, municipalRule, taxableIncome);

  const taxes = [irpefLine, regional.line, municipal.line];
  const totalTaxes = sum([irpefNet, regional.amount, municipal.amount], currency);

  // ⑦ Cash supplements, outside the tax calculation.
  const credits: CalculationLine[] = [];
  const trattamento = integrativeTreatment(
    rules,
    totalIncome,
    irpefGross.amount,
    employmentCredit.amount,
    totalTaxCredits,
  );
  if (trattamento) credits.push(trattamento);

  const somma = applyRule(rules, "IT.PAYROLL.SOMMA_INTEGRATIVA", totalIncome, { sign: 1 });
  if (somma.amount.cents > 0) credits.push(somma.line);

  const totalCredits = sum(
    credits.map((line) => line.amount),
    currency,
  );

  const netAnnual = add(subtract(subtract(gross, totalContributions), totalTaxes), totalCredits);

  return {
    gross,
    socialSecurity,
    totalContributions,
    taxableIncome,
    taxes,
    totalTaxes,
    credits,
    totalCredits,
    netAnnual,
  };
}

function zeroAppliedRule(rules: RuleSet, id: string, base: ReturnType<typeof zero>) {
  const applied = applyRule(rules, id, base);
  return {
    amount: zero(base.currency),
    line: {
      ...applied.line,
      amount: zero(base.currency),
      formula: "IRPEF non dovuta dopo le detrazioni → 0,00",
    },
  };
}
