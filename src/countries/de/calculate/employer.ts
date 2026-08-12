/**
 * German employer cost.
 *
 * Two things to note against Italy. First, there is **no severance accrual**:
 * Germany has no TFR, severance is contingent on termination rather than
 * accrued monthly, and that alone is worth about 7 points of employer cost.
 * Second, the employer's health share stops at 69.750 while the pension share
 * runs to 101.400 — so the cost curve has two distinct kinks, not one.
 *
 * U1 applies only when the represented AAG headcount is 30 or lower and then
 * requires the employer's declared Krankenkasse tariff. U1 and U2 both use
 * recurring pension-insurable remuneration, never uncapped raw gross.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { EmployerComputation } from "@engine/pipeline/assemble.ts";
import { applyDeclaredPercentageRule, applyRule } from "@engine/pipeline/helpers.ts";
import { add, sum } from "@engine/money/money.ts";
import { healthAndCareBase, levyBase, pensionInsuranceBase } from "../base.ts";
import { applyDeclaredPercentageHalfRule, declaredPercentageOption } from "../declared.ts";
import { careInsuranceEmployerKey, zusatzbeitragKey } from "../profile.ts";

export type { EmployerComputation };

const DEFAULT_RISK_CLASS = "office";

export function computeEmployer(profile: EmployeeProfile, rules: RuleSet): EmployerComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;
  const pensionBase = pensionInsuranceBase(profile, rules);
  const healthBase = healthAndCareBase(profile, rules);
  const umlageBase = levyBase(profile, rules);

  // ① Statutory contributions — the mirrored halves of the employee's four.
  const rv = applyRule(rules, "DE.RV.EMPLOYER", pensionBase, { sign: 1 });
  const av = applyRule(rules, "DE.AV.EMPLOYER", pensionBase, { sign: 1 });
  const kv = applyRule(rules, "DE.KV.EMPLOYER.BASE", healthBase, { sign: 1 });
  const declaredZusatz = declaredPercentageOption(profile, "zusatzbeitragRatePercent");
  const kvZusatz = declaredZusatz !== undefined
    ? applyDeclaredPercentageHalfRule(
        rules,
        "DE.KV.ZUSATZBEITRAG.DECLARED",
        healthBase,
        declaredZusatz,
        1,
      )
    : applyRule(rules, "DE.KV.EMPLOYER.ZUSATZBEITRAG", healthBase, {
        sign: 1,
        key: zusatzbeitragKey(profile),
      });
  const pv = applyRule(rules, "DE.PV.EMPLOYER", healthBase, {
    sign: 1,
    key: careInsuranceEmployerKey(profile),
  });

  // ② Mandatory insurance, priced by RISK rather than by income.
  const declaredUnfall = declaredPercentageOption(profile, "unfallRatePercent");
  const unfall = declaredUnfall !== undefined
    ? applyDeclaredPercentageRule(
        rules,
        "DE.UNFALLVERSICHERUNG.DECLARED",
        gross,
        declaredUnfall,
        { sign: 1 },
      )
    : applyRule(rules, "DE.UNFALLVERSICHERUNG", gross, {
        sign: 1,
        key: riskClassOf(profile),
      });

  // ③ Levies.
  const insolvenz = applyRule(rules, "DE.INSOLVENZGELDUMLAGE", pensionBase, { sign: 1 });
  const declaredU2 = declaredPercentageOption(profile, "u2RatePercent");
  const u2 = declaredU2 !== undefined
    ? applyDeclaredPercentageRule(rules, "DE.UMLAGE.U2.DECLARED", umlageBase, declaredU2, {
        sign: 1,
      })
    : applyRule(rules, "DE.UMLAGE.U2", umlageBase, { sign: 1 });

  const u1 = u1Of(profile, rules, umlageBase);

  const contributions = [rv.line, av.line, kv.line, kvZusatz.line, pv.line];
  const insurance = [unfall.line];
  const otherCosts = [insolvenz.line, ...(u1 ? [u1.line] : []), u2.line];

  const onTop = sum(
    [
      rv.amount,
      av.amount,
      kv.amount,
      kvZusatz.amount,
      pv.amount,
      unfall.amount,
      insolvenz.amount,
      ...(u1 ? [u1.amount] : []),
      u2.amount,
    ],
    currency,
  );
  const totalCost = add(gross, onTop);

  return {
    gross,
    contributions,
    insurance,
    severanceAccrual: [],
    otherCosts,
    totalCost,
    costOverGross: gross.cents === 0 ? 0 : totalCost.cents / gross.cents,
  };
}

function u1Of(profile: EmployeeProfile, rules: RuleSet, base: ReturnType<typeof levyBase>) {
  if (profile.companySize === undefined || profile.companySize > 30) return undefined;
  const declared = declaredPercentageOption(profile, "u1RatePercent");
  if (declared === undefined) {
    throw new TypeError("Umlage U1 requires the declared Krankenkasse rate for AAG headcount <= 30");
  }
  return applyDeclaredPercentageRule(rules, "DE.UMLAGE.U1.DECLARED", base, declared, { sign: 1 });
}

function riskClassOf(profile: EmployeeProfile): string {
  const value = profile.countryOptions?.["unfallRiskClass"];
  return typeof value === "string" ? value : DEFAULT_RISK_CLASS;
}
