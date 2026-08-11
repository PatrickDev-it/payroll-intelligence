/**
 * The Spanish employee pipeline.
 *
 * Two things are structurally Spanish and both are easy to get wrong.
 *
 * **The mínimo personal is not a deduction.** Spain does not subtract €5.550
 * from the base. It taxes the whole base liquidable, taxes the mínimo with the
 * SAME scale, and subtracts the second from the first (art. 63.1.2.º LIRPF).
 * The allowance is therefore always relieved at the LOWEST rate, never at the
 * marginal one — modelling it as a base deduction overstates the relief by
 * roughly €500 a year for a mid-earner.
 *
 * **Half the tax belongs to the autonomous community.** There is no single
 * Spanish scale: the state scale and the community's own scale are applied to
 * the same base and added. On €50.000 the spread between Madrid and the
 * Comunitat Valenciana is over €1.000 a year, so a "national scale" would not
 * be a simplification, it would be wrong everywhere.
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import type { EmployeeComputation } from "@engine/pipeline/assemble.ts";
import { applyRule, derivedLine, formulaParam, ruleOf } from "@engine/pipeline/helpers.ts";
import {
  add,
  clampAtZero,
  min,
  moneyFromDecimal,
  negate,
  subtract,
  sum,
  zero,
  fromCents,
} from "@engine/money/money.ts";
import { applyPrimitive } from "@engine/primitives/apply.ts";
import { MINUS, amt } from "@engine/primitives/format.ts";
import { contributionBase } from "../base.ts";
import {
  aeatWithholdingRateOf,
  autonomousScaleRuleId,
  contractKey,
  regionOf,
} from "../profile.ts";

export type { EmployeeComputation };

export function computeEmployee(profile: EmployeeProfile, rules: RuleSet): EmployeeComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  // ① The contribution base is NOT the salary: it is the salary clamped between
  //    the professional group's minimum and the single maximum, monthly. Above
  //    €61.214,40 ordinary contributions simply stop growing.
  const base = contributionBase(profile, rules);

  const comunes = applyRule(rules, "ES.SS.EMPLOYEE.CONTINGENCIAS_COMUNES", base);
  const desempleo = applyRule(rules, "ES.SS.EMPLOYEE.DESEMPLEO", base, { key: contractKey(profile) });
  const formacion = applyRule(rules, "ES.SS.EMPLOYEE.FORMACION", base);
  const mei = applyRule(rules, "ES.SS.EMPLOYEE.MEI", base);

  // …and above the ceiling the solidarity contribution takes over, which is
  // Spain deliberately closing the regressivity of its own cap.
  const solidaridad = applyRule(rules, "ES.SS.EMPLOYEE.SOLIDARIDAD", gross);

  const socialSecurity: CalculationLine[] = [
    comunes.line,
    desempleo.line,
    formacion.line,
    mei.line,
  ];
  if (solidaridad.amount.cents > 0) socialSecurity.push(solidaridad.line);

  const totalContributions = sum(
    [comunes.amount, desempleo.amount, formacion.amount, mei.amount, solidaridad.amount],
    currency,
  );

  // ② Rendimiento neto → base liquidable general.
  const otrosGastos = moneyFromDecimal(
    formulaParam(ruleOf(rules, "ES.IRPF.GASTOS.OTROS"), "amount"),
    currency,
  );
  const rendimientoNeto = clampAtZero(subtract(subtract(gross, totalContributions), otrosGastos));
  const reduccion = applyRule(rules, "ES.IRPF.REDUCCION.TRABAJO", rendimientoNeto, { sign: 1 });
  const baseLiquidable = clampAtZero(subtract(rendimientoNeto, reduccion.amount));

  // ③ Two halves of one tax, each on the same base, each net of the mínimo.
  const minimo = moneyFromDecimal(
    formulaParam(ruleOf(rules, "ES.IRPF.MINIMO.CONTRIBUYENTE"), "amount"),
    currency,
  );
  const estatal = scaleHalf(rules, "ES.IRPF.ESCALA.ESTATAL", baseLiquidable, minimo);
  const autonomica = scaleHalf(rules, autonomousScaleRuleId(regionOf(profile)), baseLiquidable, minimo);

  const estimatedLiability = add(estatal.amount, autonomica.amount);
  const ratePercent = aeatWithholdingRateOf(profile);
  const rateBasisPoints = Math.round(ratePercent * 100);
  const withholding = fromCents(Math.round((gross.cents * rateBasisPoints) / 10_000), currency);
  const liabilityComparison = derivedLine(
    "ES.IRPF.LIABILITY_ESTIMATE",
    "Stima dell'imposta annuale finale (non è la ritenuta)",
    negate(estimatedLiability),
    `${amt(estatal.amount)} (estatal) + ${amt(autonomica.amount)} (autonómica); ` +
      "dato di confronto, non sottratto dal cedolino",
    [estatal.ruleId, autonomica.ruleId],
    estatal.confidence,
    [estatal.line, autonomica.line],
  );
  const taxes = [
    derivedLine(
      "ES.IRPF.RETENCION",
      "Ritenuta IRPF in nómina (AEAT)",
      negate(withholding),
      `${amt(gross)} × ${ratePercent.toFixed(2).replace(".", ",")}% (aliquota AEAT dichiarata)`,
      ["ES.IRPF.RETENCION.AEAT"],
      ruleOf(rules, "ES.IRPF.RETENCION.AEAT").verification.status,
      [liabilityComparison],
    ),
  ];

  const deductionLines: CalculationLine[] = [
    derivedLine(
      "ES.IRPF.GASTOS.OTROS",
      ruleOf(rules, "ES.IRPF.GASTOS.OTROS").label,
      negate(otrosGastos),
      `${amt(otrosGastos)} (art. 19.2.f LIRPF)`,
      ["ES.IRPF.GASTOS.OTROS"],
      ruleOf(rules, "ES.IRPF.GASTOS.OTROS").verification.status,
    ),
  ];
  if (reduccion.amount.cents > 0) deductionLines.push(reduccion.line);
  taxes[0] = {
    ...(taxes[0] as CalculationLine),
    children: [
      {
        ...liabilityComparison,
        children: [...deductionLines, estatal.line, autonomica.line],
      },
    ],
  };

  return {
    gross,
    socialSecurity,
    totalContributions,
    taxableIncome: baseLiquidable,
    taxes,
    totalTaxes: withholding,
    // Spain pays no cash supplement through payroll.
    credits: [],
    totalCredits: zero(currency),
    netAnnual: subtract(subtract(gross, totalContributions), withholding),
  };
}

/**
 * `cuota íntegra = escala(base liquidable) − escala(mínimo personal)`.
 *
 * The subtraction is the whole point: it is why the €5.550 is worth 9,5% of
 * itself and not 30% of itself.
 */
function scaleHalf(
  rules: RuleSet,
  ruleId: string,
  baseLiquidable: Money,
  minimo: Money,
): {
  readonly amount: Money;
  readonly line: CalculationLine;
  readonly ruleId: string;
  readonly confidence: CalculationLine["confidence"];
} {
  const rule = ruleOf(rules, ruleId);
  const onBase = applyPrimitive(rule.config, { base: baseLiquidable });
  const onMinimo = applyPrimitive(rule.config, { base: min(minimo, baseLiquidable) });
  const amount = clampAtZero(subtract(onBase.amount, onMinimo.amount));

  return {
    amount,
    ruleId: rule.id,
    confidence: rule.verification.status,
    line: derivedLine(
      rule.id,
      rule.label,
      negate(amount),
      `${onBase.formula} ${MINUS} ${amt(onMinimo.amount)} (mínimo personal ${amt(minimo)} gravado a la misma escala)`,
      [rule.id, "ES.IRPF.MINIMO.CONTRIBUYENTE"],
      rule.verification.status,
    ),
  };
}
