/**
 * Spanish employer cost — the mirror image of the employee side, and the reason
 * comparing employee contribution rates across countries is meaningless.
 *
 * The employee pays 6,50%, the lowest in the EU-15. The employer pays over 32%.
 * Spain has not made social security cheap; it has moved almost all of it to
 * the other side of the payslip.
 *
 * No severance accrual: `indemnización por despido` is contingent on dismissal,
 * not accrued monthly like Italian TFR.
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { EmployerComputation } from "@engine/pipeline/assemble.ts";
import { applyDeclaredPercentageRule, applyRule } from "@engine/pipeline/helpers.ts";
import { add, sum } from "@engine/money/money.ts";
import { contributionBase } from "../base.ts";
import { contractKey, riskClassOf } from "../profile.ts";

export type { EmployerComputation };

export function computeEmployer(profile: EmployeeProfile, rules: RuleSet): EmployerComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;
  const base = contributionBase(profile, rules);
  const contract = contractKey(profile);

  const comunes = applyRule(rules, "ES.SS.EMPLOYER.CONTINGENCIAS_COMUNES", base, { sign: 1 });
  const desempleo = applyRule(rules, "ES.SS.EMPLOYER.DESEMPLEO", base, { sign: 1, key: contract });
  const fogasa = applyRule(rules, "ES.SS.EMPLOYER.FOGASA", base, { sign: 1 });
  const formacion = applyRule(rules, "ES.SS.EMPLOYER.FORMACION", base, { sign: 1 });
  const mei = applyRule(rules, "ES.SS.EMPLOYER.MEI", base, { sign: 1 });
  const solidaridad = applyRule(rules, "ES.SS.EMPLOYER.SOLIDARIDAD", gross, { sign: 1 });
  const declaredAtep = Number(profile.countryOptions?.["atepRatePercent"]);
  const atep = Number.isFinite(declaredAtep)
    ? applyDeclaredPercentageRule(rules, "ES.SS.EMPLOYER.ATEP.DECLARED", base, declaredAtep, {
        sign: 1,
      })
    : applyRule(rules, "ES.SS.EMPLOYER.ATEP", base, { sign: 1, key: riskClassOf(profile) });

  const contributions: CalculationLine[] = [
    comunes.line,
    desempleo.line,
    fogasa.line,
    formacion.line,
    mei.line,
  ];

  if (solidaridad.amount.cents > 0) contributions.push(solidaridad.line);

  const onTop = sum(
    [
      comunes.amount,
      desempleo.amount,
      fogasa.amount,
      formacion.amount,
      mei.amount,
      solidaridad.amount,
      atep.amount,
    ],
    currency,
  );
  const totalCost = add(gross, onTop);

  return {
    gross,
    contributions,
    insurance: [atep.line],
    severanceAccrual: [],
    otherCosts: [],
    totalCost,
    costOverGross: gross.cents === 0 ? 0 : totalCost.cents / gross.cents,
  };
}
