/**
 * French employer cost, after the reform that took effect on 1 January 2026.
 *
 * Until 2025 the employer paid a REDUCED maladie rate (7% up to 2,5 SMIC) and a
 * reduced allocations familiales rate (3,45% up to 3,5 SMIC), on top of the
 * Fillon reduction up to 1,6 SMIC. From 2026 all three are gone, merged into a
 * single `réduction générale dégressive unique` that runs to 3 SMIC — so the
 * headline rates are now the full 13% and 5,25%, and the relief arrives as one
 * explicit negative line instead of three invisible ones.
 *
 * That is why this file shows a cost that looks higher than any 2025 reference
 * and then subtracts the RGDU: it is the same money, made visible.
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import type { EmployerComputation } from "@engine/pipeline/assemble.ts";
import {
  applyDeclaredPercentageRule,
  applyRule,
  derivedLine,
  formulaParam,
  ruleOf,
} from "@engine/pipeline/helpers.ts";
import { add, fromCents, moneyFromDecimal, negate, sum } from "@engine/money/money.ts";
import { TIMES, amt } from "@engine/primitives/format.ts";
import { atmpKey, fnalKey, isCadre, mobilityKey, trainingKey } from "../profile.ts";

export type { EmployerComputation };

export function computeEmployer(profile: EmployeeProfile, rules: RuleSet): EmployerComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  const contributions: CalculationLine[] = [];
  const amounts: Money[] = [];
  const add1 = (id: string, options: Parameters<typeof applyRule>[3] = {}) => {
    const result = applyRule(rules, id, gross, { sign: 1, ...options });
    if (result.amount.cents !== 0) {
      contributions.push(result.line);
      amounts.push(result.amount);
    }
  };

  add1("FR.PAT.MALADIE");
  add1("FR.PAT.VIEILLESSE.PLAFONNEE");
  add1("FR.PAT.VIEILLESSE.DEPLAFONNEE");
  add1("FR.PAT.ALLOCATIONS_FAMILIALES");
  add1("FR.PAT.CSA");
  add1("FR.PAT.CHOMAGE");
  add1("FR.PAT.AGS");
  add1("FR.PAT.RETRAITE.T1");
  add1("FR.PAT.CEG.T1");
  add1("FR.PAT.RETRAITE.T2");
  add1("FR.PAT.CEG.T2");
  add1("FR.PAT.CET");
  if (isCadre(profile)) add1("FR.PAT.APEC");

  const declaredAtmp = profile.countryOptions?.["atmpRatePercent"];
  const atmp = typeof declaredAtmp === "string" || typeof declaredAtmp === "number"
    ? applyDeclaredPercentageRule(rules, "FR.PAT.ATMP.DECLARED", gross, declaredAtmp, {
        sign: 1,
      })
    : applyRule(rules, "FR.PAT.ATMP", gross, { sign: 1, key: atmpKey(profile) });

  const other: CalculationLine[] = [];
  const otherAmounts: Money[] = [];
  const addOther = (id: string, key?: string) => {
    const result = applyRule(rules, id, gross, key === undefined ? { sign: 1 } : { sign: 1, key });
    if (result.amount.cents !== 0) {
      other.push(result.line);
      otherAmounts.push(result.amount);
    }
  };

  addOther("FR.PAT.FNAL", fnalKey(profile));
  addOther("FR.PAT.DIALOGUE_SOCIAL");
  addOther("FR.PAT.FORMATION", trainingKey(profile));
  addOther("FR.PAT.TAXE_APPRENTISSAGE");
  const declaredMobility = profile.countryOptions?.["versementMobiliteRatePercent"];
  if (typeof declaredMobility === "string" || typeof declaredMobility === "number") {
    const mobility = applyDeclaredPercentageRule(
      rules,
      "FR.PAT.VERSEMENT_MOBILITE.DECLARED",
      gross,
      declaredMobility,
      { sign: 1 },
    );
    if (mobility.amount.cents !== 0) {
      other.push(mobility.line);
      otherAmounts.push(mobility.amount);
    }
  } else {
    addOther("FR.PAT.VERSEMENT_MOBILITE", mobilityKey(profile));
  }

  const reduction = generalReduction(profile, rules, gross);
  if (reduction.amount.cents > 0) {
    other.push(reduction.line);
    otherAmounts.push(negate(reduction.amount));
  }

  const onTop = add(sum(amounts, currency), add(atmp.amount, sum(otherAmounts, currency)));
  const totalCost = add(gross, onTop);

  return {
    gross,
    contributions,
    insurance: [atmp.line],
    // No severance accrual: French `indemnité de licenciement` is contingent.
    severanceAccrual: [],
    otherCosts: other,
    totalCost,
    costOverGross: gross.cents === 0 ? 0 : totalCost.cents / gross.cents,
  };
}

/**
 * The RGDU, art. L241-13 and D241-7 CSS as rewritten by the LFSS 2025 and the
 * décret n° 2025-887:
 *
 *     C = Tmin + Tdelta × [0,5 × (3 × SMIC annuel / rémunération − 1)]^1,75
 *
 * capped at Tmin + Tdelta, zero from 3 SMIC upward, and rounded to four
 * decimals as the code requires. `Tdelta` depends on the Fnal rate the employer
 * pays, because Fnal is one of the contributions the reduction is charged
 * against.
 *
 * The exponent is the one part of this engine that is not integer arithmetic:
 * the coefficient is a real number by construction. It is rounded to the
 * statutory four decimals BEFORE it touches any money, so the result is still
 * deterministic to the cent.
 */
function generalReduction(
  profile: EmployeeProfile,
  rules: RuleSet,
  gross: Money,
): { readonly amount: Money; readonly line: CalculationLine } {
  const rule = ruleOf(rules, "FR.PAT.REDUCTION_GENERALE");
  const currency = gross.currency;
  const smic = moneyFromDecimal(formulaParam(rule, "smicAnnual"), currency);
  const multiple = Number(formulaParam(rule, "multiple"));
  const tmin = Number(formulaParam(rule, "tmin"));
  const tdelta = Number(
    formulaParam(rule, fnalKey(profile) === "fifty_plus" ? "tdeltaFnalHigh" : "tdeltaFnalLow"),
  );
  const exponent = Number(formulaParam(rule, "exponent"));

  // CSS D241-7 prorates the annual SMIC reference for contractual working
  // time.  Gross is already the employee's actual annual remuneration, so the
  // reference — not gross — is what must be reduced for part-time work.
  const proratedSmic = fromCents(
    Math.round((smic.cents * profile.workingTimePercent) / 100),
    currency,
  );
  const ceiling = proratedSmic.cents * multiple;
  if (gross.cents <= 0 || gross.cents >= ceiling) {
    return {
      amount: fromCents(0, currency),
      line: derivedLine(
        rule.id,
        rule.label,
        fromCents(0, currency),
        `${amt(gross)} ≥ ${multiple} ${TIMES} SMIC (${amt(fromCents(ceiling, currency))}) → 0,00`,
        [rule.id],
        rule.verification.status,
      ),
    };
  }

  const raw = tmin + tdelta * Math.pow(0.5 * (ceiling / gross.cents - 1), exponent);
  const coefficient = Math.min(tmin + tdelta, Math.round(raw * 10_000) / 10_000);
  const amount = fromCents(Math.round(gross.cents * coefficient), currency);

  return {
    amount,
    line: derivedLine(
      rule.id,
      rule.label,
      negate(amount),
      `coefficient ${coefficient.toFixed(4).replace(".", ",")} ${TIMES} ${amt(gross)} ` +
        `(SMIC de référence ${amt(proratedSmic)} à ${profile.workingTimePercent}%, ` +
        `extinction à ${multiple} SMIC)`,
      [rule.id],
      rule.verification.status,
    ),
  };
}
