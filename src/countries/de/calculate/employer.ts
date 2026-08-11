/**
 * German employer cost.
 *
 * Two things to note against Italy. First, there is **no severance accrual**:
 * Germany has no TFR, severance is contingent on termination rather than
 * accrued monthly, and that alone is worth about 7 points of employer cost.
 * Second, the employer's health share stops at 69.750 while the pension share
 * runs to 101.400 — so the cost curve has two distinct kinks, not one.
 *
 * `Umlage U1` (sick-pay reimbursement) is excluded: it applies only to
 * employers with 30 or fewer employees and its rate is set per fund and per
 * chosen reimbursement level, so any single number would be wrong for almost
 * everyone. Documented in docs/06-simplifications.md rather than guessed.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { EmployerComputation } from "@engine/pipeline/assemble.ts";
import { applyDeclaredPercentageRule, applyRule } from "@engine/pipeline/helpers.ts";
import { add, min, moneyFromDecimal, sum } from "@engine/money/money.ts";
import { ruleOf } from "@engine/pipeline/helpers.ts";
import { careInsuranceEmployerKey, zusatzbeitragKey } from "../profile.ts";

export type { EmployerComputation };

const DEFAULT_RISK_CLASS = "office";

export function computeEmployer(profile: EmployeeProfile, rules: RuleSet): EmployerComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  const healthConfig = ruleOf(rules, "DE.KV.EMPLOYER.BASE").config;
  if (healthConfig.kind !== "capped_rate") {
    throw new TypeError("DE.KV.EMPLOYER.BASE must be a capped_rate");
  }
  const healthBase = min(gross, moneyFromDecimal(healthConfig.ceiling, currency));

  // ① Statutory contributions — the mirrored halves of the employee's four.
  const rv = applyRule(rules, "DE.RV.EMPLOYER", gross, { sign: 1 });
  const av = applyRule(rules, "DE.AV.EMPLOYER", gross, { sign: 1 });
  const kv = applyRule(rules, "DE.KV.EMPLOYER.BASE", gross, { sign: 1 });
  const declaredZusatz = Number(profile.countryOptions?.["zusatzbeitragRatePercent"]);
  const kvZusatz = Number.isFinite(declaredZusatz)
    ? applyDeclaredPercentageRule(
        rules,
        "DE.KV.ZUSATZBEITRAG.DECLARED",
        healthBase,
        declaredZusatz / 2,
        { sign: 1 },
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
  const declaredUnfall = Number(profile.countryOptions?.["unfallRatePercent"]);
  const unfall = Number.isFinite(declaredUnfall)
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
  const insolvenz = applyRule(rules, "DE.INSOLVENZGELDUMLAGE", gross, { sign: 1 });
  const declaredU2 = Number(profile.countryOptions?.["u2RatePercent"]);
  const u2 = Number.isFinite(declaredU2)
    ? applyDeclaredPercentageRule(rules, "DE.UMLAGE.U2.DECLARED", gross, declaredU2, {
        sign: 1,
      })
    : applyRule(rules, "DE.UMLAGE.U2", gross, { sign: 1 });

  const contributions = [rv.line, av.line, kv.line, kvZusatz.line, pv.line];
  const insurance = [unfall.line];
  const otherCosts = [insolvenz.line, u2.line];

  const onTop = sum(
    [rv.amount, av.amount, kv.amount, kvZusatz.amount, pv.amount, unfall.amount, insolvenz.amount, u2.amount],
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

function riskClassOf(profile: EmployeeProfile): string {
  const value = profile.countryOptions?.["unfallRiskClass"];
  return typeof value === "string" ? value : DEFAULT_RISK_CLASS;
}
